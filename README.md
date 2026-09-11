# Digitize

Run the complete application (PostgreSQL, admin/customer APIs, migrations, public UI, admin UI, and HAProxy)
from this directory.

```sh
cp .env.example .env
# Set JWT_SECRET and POSTGRES_PASSWORD in .env
./scripts/deploy.sh
```

HAProxy is the only public service: the customer storefront is available at
`http://localhost:3000`, the admin UI's authenticated pages start at
`/business`, the admin API is under `/api/business`, and the customer API is under
`/api/public`. Public products are readable without an account; customer
registration/login is required before the storefront can submit an order.
Change `APP_PORT` in `.env` if the port is in use.

Set `PUBLIC_STORE_ID` (recommended) or `PUBLIC_STORE_SLUG` in `.env` to choose
which store is displayed by the public UI. Without either value, the newest store
is used for local development.

To enable UPI payments, add Razorpay test keys as `RAZORPAY_KEY_ID` and
`RAZORPAY_KEY_SECRET`, then set `RAZORPAY_WEBHOOK_SECRET`. Configure the webhook
URL as `/api/public/payments/razorpay/webhook` and subscribe to
`payment.captured` and `payment.failed`. Replace test keys with live keys only
after completing Razorpay's go-live checks.
Stop the stack with `docker compose down`; the PostgreSQL volume is preserved.

## CI/CD and Amazon EKS

GitHub Actions now validates every application and container image. The manually
triggered deployment workflow publishes immutable images to Amazon ECR and
updates DEV's Git state; Argo CD runs migrations and reconciles EKS. See
[`docs/aws-cicd-setup.md`](docs/aws-cicd-setup.md) for the required AWS and
GitHub configuration.

For the complete DEV cluster bootstrap, follow
[`docs/dev-eks-argocd-bootstrap.md`](docs/dev-eks-argocd-bootstrap.md).
