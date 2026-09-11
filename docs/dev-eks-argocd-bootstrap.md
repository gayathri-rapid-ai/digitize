# DEV Amazon EKS and Argo CD bootstrap

This guide creates the single `digitize-dev` Amazon EKS Auto Mode cluster in
`ap-south-1`, prepares its ECR repositories and Kubernetes prerequisites, and
installs Argo CD. It intentionally creates DEV only. Run commands from the
repository root.

> AWS resources in this guide incur charges. Use an IAM role or IAM Identity
> Center session with administrator-level bootstrap permissions. Do not use AWS
> root-user access keys.

## 1. Install the local command-line tools

On macOS with Homebrew:

```sh
brew install awscli eksctl kubectl argocd
```

Confirm that each tool is available:

```sh
aws --version
eksctl version
kubectl version --client
argocd version --client
```

`kubectl` should be no more than one minor version older or newer than the EKS
cluster version selected by AWS.

## 2. Authenticate to the DEV AWS account

Prefer an AWS IAM Identity Center profile:

```sh
aws configure sso --profile digitize-dev
export AWS_PROFILE=digitize-dev
export AWS_REGION=ap-south-1
export AWS_DEFAULT_REGION=ap-south-1
```

Verify the account before creating anything:

```sh
aws sts get-caller-identity
```

Record the account ID and ECR registry:

```sh
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
printf '%s\n' "$AWS_ACCOUNT_ID" "$ECR_REGISTRY"
```

Stop if this is not the intended DEV account.

## 3. Review and create the EKS Auto Mode cluster

Review the cluster declaration:

```sh
sed -n '1,200p' infra/dev/eks-auto-mode.yaml
```

Create the cluster and its eksctl-managed VPC. This usually takes 15–30 minutes:

```sh
eksctl create cluster --config-file infra/dev/eks-auto-mode.yaml
```

The configuration enables EKS Auto Mode with the `system` and
`general-purpose` node pools and all EKS control-plane log types. Auto Mode
manages compute scaling, pod networking, load balancing, and block storage.

Confirm that the cluster is active:

```sh
aws eks describe-cluster \
  --name digitize-dev \
  --region "$AWS_REGION" \
  --query 'cluster.{status:status,version:version,endpoint:endpoint}' \
  --output table
```

## 4. Configure and verify kubectl access

```sh
aws eks update-kubeconfig \
  --name digitize-dev \
  --region "$AWS_REGION" \
  --alias digitize-dev

kubectl config use-context digitize-dev
kubectl cluster-info
kubectl get nodes -o wide
kubectl get pods -n kube-system
```

The IAM principal that creates an eksctl cluster normally receives cluster
administration access. To grant a different IAM role bootstrap access, use an
EKS access entry:

```sh
export EKS_ADMIN_ROLE_ARN=arn:aws:iam::${AWS_ACCOUNT_ID}:role/REPLACE_WITH_ADMIN_ROLE

aws eks create-access-entry \
  --cluster-name digitize-dev \
  --principal-arn "$EKS_ADMIN_ROLE_ARN" \
  --type STANDARD

aws eks associate-access-policy \
  --cluster-name digitize-dev \
  --principal-arn "$EKS_ADMIN_ROLE_ARN" \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy \
  --access-scope type=cluster
```

Skip those two commands when the role already has an access entry. Reduce this
permission after cluster bootstrapping.

## 5. Create the application ECR repositories

```sh
for repository in \
  digitize-admin-api \
  digitize-customer-api \
  digitize-admin-ui \
  digitize-ui \
  digitize-preview
do
  aws ecr describe-repositories \
    --repository-names "$repository" \
    --region "$AWS_REGION" >/dev/null 2>&1 || \
  aws ecr create-repository \
    --repository-name "$repository" \
    --image-scanning-configuration scanOnPush=true \
    --image-tag-mutability IMMUTABLE \
    --region "$AWS_REGION"
done
```

Verify them:

```sh
aws ecr describe-repositories \
  --region "$AWS_REGION" \
  --query 'repositories[?starts_with(repositoryName, `digitize-`)].repositoryUri' \
  --output table
```

## 6. Create the DEV application namespace and runtime secret

The database must already be reachable from the EKS VPC. Substitute a DEV RDS
or other DEV PostgreSQL connection string and strong random secrets below.

```sh
kubectl apply -f k8s/namespace.yaml

kubectl create secret generic digitize-secrets \
  --namespace digitize \
  --from-literal=DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/digitize' \
  --from-literal=JWT_SECRET='REPLACE_WITH_A_LONG_RANDOM_VALUE' \
  --from-literal=CUSTOMER_JWT_SECRET='REPLACE_WITH_ANOTHER_LONG_RANDOM_VALUE' \
  --dry-run=client \
  --output yaml | kubectl apply -f -
```

Do not put real secret values into Git. Manual Kubernetes secret management is
temporary for DEV; use AWS Secrets Manager before production.

Confirm that only the secret's metadata is displayed:

```sh
kubectl get secret digitize-secrets -n digitize
```

## 7. Configure the EKS Auto Mode ALB ingress class

The application Ingress uses `ingressClassName: alb`. Create that class before
the first Argo sync:

```sh
kubectl apply -f k8s/platform/dev-ingress-class.yaml
kubectl get ingressclass alb
```

This DEV class creates an internet-facing Application Load Balancer. HTTPS,
ACM, Route 53, and wildcard customer subdomains can be added after the initial
HTTP deployment is healthy.

## 8. Install Argo CD

For DEV, install Argo CD's official non-HA manifest. Production should use a
pinned, reviewed release and an HA configuration.

```sh
kubectl create namespace argocd

kubectl apply \
  --namespace argocd \
  --server-side \
  --force-conflicts \
  --filename https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Wait for the Argo components:

```sh
kubectl rollout status deployment/argocd-server \
  --namespace argocd \
  --timeout=5m

kubectl rollout status deployment/argocd-repo-server \
  --namespace argocd \
  --timeout=5m

kubectl rollout status statefulset/argocd-application-controller \
  --namespace argocd \
  --timeout=5m

kubectl get pods --namespace argocd
```

## 9. Configure repository access

No repository credential is needed when the GitHub repository is public. For a
private repository, create a GitHub App for Argo CD and add it without committing
the App ID, installation ID, or private key:

```sh
argocd repo add https://github.com/gayathri-rapid-ai/digitize.git \
  --github-app-id REPLACE_APP_ID \
  --github-app-installation-id REPLACE_INSTALLATION_ID \
  --github-app-private-key-path /secure/local/path/github-app.pem
```

Run this after completing the local UI/CLI login in the next section. GitHub App
credentials are preferred over a personal access token.

## 10. Access the Argo CD UI and CLI locally

Retrieve the generated initial password without printing it into a shared log:

```sh
argocd admin initial-password --namespace argocd
```

In a dedicated terminal, start a local-only tunnel:

```sh
kubectl port-forward service/argocd-server \
  --namespace argocd \
  8080:443
```

Open `https://localhost:8080`, accept the DEV self-signed certificate warning,
and sign in as `admin`. For CLI access:

```sh
argocd login localhost:8080 --username admin --insecure
```

Change the initial password, store the replacement in an approved password
manager, and remove the bootstrap secret:

```sh
argocd account update-password
kubectl delete secret argocd-initial-admin-secret --namespace argocd
```

## 11. Configure GitHub Actions for the manual release

Create a GitHub environment named `dev` and set these environment variables:

| Variable | Value |
| --- | --- |
| `AWS_REGION` | `ap-south-1` |
| `AWS_DEPLOY_ROLE_ARN` | GitHub OIDC role that can push to the five ECR repositories |
| `NEXT_PUBLIC_API_URL` | Empty for same-origin routing |
| `NEXT_PUBLIC_CUSTOMER_API_URL` | Empty for same-origin routing |

The OIDC role setup is described in `docs/aws-cicd-setup.md`. It needs ECR push
permissions but no Kubernetes permissions. The workflow also needs repository
`contents: write` permission to commit the approved image SHA to the DEV overlay.

Commit and push the bootstrap files, then manually run:

```text
GitHub → Actions → Deploy to Amazon EKS → Run workflow
```

Wait for that workflow to commit the actual ECR registry and image SHA into
`k8s/overlays/dev/kustomization.yaml` before registering the Argo application.

## 12. Register the Digitize DEV application

```sh
kubectl apply -f argocd/application-dev.yaml
kubectl get application digitize-dev --namespace argocd
```

Argo CD will automatically synchronize the DEV Git state. It runs
`digitize-migrate` as a `PreSync` hook; the application deployments are updated
only when that migration succeeds.

Watch the first deployment:

```sh
argocd app get digitize-dev
argocd app wait digitize-dev --sync --health --timeout 600
kubectl get pods,services,ingress --namespace digitize
```

Retrieve the generated ALB hostname:

```sh
kubectl get ingress digitize \
  --namespace digitize \
  --output jsonpath='{.status.loadBalancer.ingress[0].hostname}{"\n"}'
```

It can take several minutes for the ALB and its targets to become healthy.

## 13. Normal DEV release procedure

1. Merge code only after CI succeeds. A merge does not change the deployed image.
2. Manually run **Deploy to Amazon EKS** in GitHub Actions.
3. GitHub Actions builds and pushes immutable SHA-tagged images.
4. The workflow commits that SHA to the DEV Kustomize overlay.
5. Argo CD runs migrations and reconciles the cluster.
6. Confirm `Synced` and `Healthy` in Argo CD.

## 14. Troubleshooting commands

```sh
argocd app get digitize-dev
argocd app diff digitize-dev
kubectl get application digitize-dev -n argocd -o yaml
kubectl get events -n digitize --sort-by=.lastTimestamp
kubectl get pods -n digitize -o wide
kubectl logs -n digitize -l app=admin-api --tail=100
kubectl logs -n digitize -l app=customer-api --tail=100
kubectl describe ingress digitize -n digitize
```

For an Argo controller problem:

```sh
kubectl logs deployment/argocd-repo-server -n argocd --tail=200
kubectl logs statefulset/argocd-application-controller -n argocd --tail=200
```

## 15. DEV teardown

Teardown permanently deletes the DEV cluster and cluster-local data. Delete the
Argo application first so its ALB can be removed cleanly:

```sh
kubectl delete application digitize-dev --namespace argocd
kubectl wait --for=delete ingress/digitize --namespace digitize --timeout=10m
eksctl delete cluster --config-file infra/dev/eks-auto-mode.yaml --wait
```

ECR repositories and an external RDS database are not deleted by `eksctl`.
Remove those separately only after confirming that their data and images are no
longer required.
