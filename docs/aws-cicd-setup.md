# AWS CI/CD setup

The repository workflows authenticate to AWS using GitHub OIDC. They do not use
long-lived AWS access keys.

## One-time AWS setup

1. Create these private ECR repositories in the deployment account:
   `digitize-admin-api`, `digitize-customer-api`, `digitize-admin-ui`,
   `digitize-ui`, and `digitize-preview`.
2. Create an IAM OIDC provider for `https://token.actions.githubusercontent.com`.
3. Create a deployment role whose trust policy is restricted to this repository
   and the GitHub `dev` environment.
4. Give the role permission to push to the five ECR repositories. GitHub Actions
   does not require Kubernetes credentials; Argo CD performs the deployment.
5. Create a GitHub environment named `dev`.
6. Allow GitHub Actions to create the DEV image-version commit on `main`. Protect
   changes under `k8s/` with review rules so ordinary application merges cannot
   modify deployment state unnoticed.

## GitHub environment variables

Set the following variables in the GitHub `dev` environment:

| Variable | Example |
| --- | --- |
| `AWS_REGION` | `ap-south-1` |
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::123456789012:role/github-digitize-deploy` |
| `NEXT_PUBLIC_API_URL` | Empty for same-origin routing |
| `NEXT_PUBLIC_CUSTOMER_API_URL` | Empty for same-origin routing |

## Runtime secrets

Before the first deployment, create the Kubernetes secret below through your
approved secret-management process. Do not commit its values.

```sh
kubectl create namespace digitize --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic digitize-secrets -n digitize \
  --from-literal=DATABASE_URL='postgresql://...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=CUSTOMER_JWT_SECRET='...'
```

Add Google and Razorpay test keys to this secret when those integrations are
enabled. Manual secret creation is acceptable for this temporary dev setup;
Secrets Manager integration can be added before production.

## Install Argo CD in the DEV cluster

Confirm that `kubectl` points at `digitize-dev`, then install the non-HA Argo CD
distribution. Non-HA is appropriate for DEV; use a pinned HA release later for
production.

```sh
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl rollout status deployment/argocd-server -n argocd --timeout=5m
```

If this GitHub repository is private, configure an Argo CD GitHub App repository
credential before creating the application. Never store a GitHub token in this
repository.

After the DEV overlay contains the correct ECR registry, register the application:

```sh
kubectl apply -f argocd/application-dev.yaml
kubectl get application digitize-dev -n argocd
```

For local UI access without exposing Argo CD publicly:

```sh
kubectl port-forward service/argocd-server -n argocd 8080:443
```

## Release process

Pull requests and pushes to `main` run `.github/workflows/ci.yml`. After CI is
green, run **Deploy to Amazon EKS** from the Actions page. It targets only the
`dev` GitHub environment. The workflow builds five SHA-tagged images, pushes
them to ECR, and commits the immutable tag to `k8s/overlays/dev`. Argo CD detects
that desired-state change, runs the database migration as a `PreSync` hook, and
then reconciles the application workloads. A normal application-code merge does
not change the image tag and therefore does not release a new version.
