# PixLink — EC2 Deployment Guide

Step-by-step commands to deploy PixLink on a fresh Ubuntu 22.04 EC2 instance.
Run each block as shown; comments explain why each step is needed.

---

## 0. Prerequisites

- EC2 instance: Ubuntu 22.04 LTS, t3.micro or larger
- Security Group inbound rules: TCP 22 (SSH), TCP 80 (HTTP), TCP 443 (HTTPS)
- IAM Role attached to the instance with the following inline policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:YOUR_REGION:*:table/YOUR_TABLE_NAME"
    }
  ]
}
```

> **Never put AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY in your .env on EC2.**
> The IAM role on the instance handles authentication automatically via the instance metadata service.

---

## 1. Connect to the Instance

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## 2. System Updates & Essential Packages

```bash
sudo apt update && sudo apt upgrade -y

# Install curl, git, build tools
sudo apt install -y curl git build-essential ufw
```

---

## 3. Install Node.js 20 (via NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Confirm versions
node -v   # should print v20.x.x
npm -v
```

---

## 4. Install PM2 (process manager) and Nginx

```bash
# PM2 keeps the Express app running and auto-restarts on crash
sudo npm install -g pm2

# Nginx acts as the reverse proxy (port 80 → Express)
sudo apt install -y nginx
```

---

## 5. Configure UFW Firewall

```bash
# Allow SSH so you don't lock yourself out
sudo ufw allow OpenSSH

# Allow web traffic
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Confirm rules
sudo ufw status
```

---

## 6. Clone the Repository

```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/pixlink.git
cd pixlink
```

---

## 7. Install Dependencies

```bash
# Backend
cd backend
npm install --production
cd ..

# Frontend — build the static files
cd frontend
npm install
npm run build        # outputs to frontend/dist/
cd ..
```

---

## 8. Configure Environment Variables

```bash
cd /home/ubuntu/pixlink/backend
cp .env.example .env
nano .env
```

Fill in your values:

```
AWS_REGION=us-east-1
S3_BUCKET_NAME=pixlink-images-bucket
DYNAMO_TABLE_NAME=pixlink-images
CLOUDFRONT_BASE_URL=https://dXXXXXXXXXXXX.cloudfront.net   # omit if not using CloudFront
PORT=4000
ALLOWED_ORIGIN=http://YOUR_EC2_PUBLIC_IP                   # or https://yourdomain.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=20
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## 9. Create DynamoDB Table (if not already done)

Run this from your local machine with AWS CLI configured, or from the EC2 instance:

```bash
aws dynamodb create-table \
  --table-name pixlink-images \
  --attribute-definitions AttributeName=code,AttributeType=S \
  --key-schema AttributeName=code,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## 10. Start the Backend with PM2

```bash
cd /home/ubuntu/pixlink/backend

# Start Express app under PM2 with the name "pixlink-api"
pm2 start server.js --name pixlink-api

# Confirm it's running
pm2 status

# Tail live logs
pm2 logs pixlink-api --lines 50
```

---

## 11. Configure Nginx as Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/pixlink
```

Paste the following (replace `YOUR_EC2_PUBLIC_IP` or your domain):

```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;   # or yourdomain.com

    # Serve the React static build
    root /home/ubuntu/pixlink/frontend/dist;
    index index.html;

    # API and redirect routes → Express
    location /api/ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Upload size limit — must match backend validation (10 MB + headroom)
        client_max_body_size 12M;
    }

    location /i/ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }

    # SPA fallback — any unknown route serves index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/pixlink /etc/nginx/sites-enabled/

# Remove the default site to avoid conflicts
sudo rm -f /etc/nginx/sites-enabled/default

# Test the config for syntax errors
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 12. Persist PM2 on Reboot (systemd startup)

```bash
# Generate and apply the startup hook (follow the printed instruction exactly)
pm2 startup

# Save the current PM2 process list so it restores on reboot
pm2 save
```

PM2 will print a `sudo env PATH=...` command — copy and run it exactly as printed.

---

## 13. Smoke Test

```bash
# Health check
curl http://YOUR_EC2_PUBLIC_IP/api/health
# Expected: {"status":"ok","ts":"..."}

# Open in browser
open http://YOUR_EC2_PUBLIC_IP
```

---

## 14. (Optional) Add HTTPS with Certbot

If you have a domain pointed at the EC2 IP:

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot auto-renews; verify the timer is active
sudo systemctl status certbot.timer
```

---

## 15. (Optional) CloudFront in Front of S3

1. In the AWS Console → CloudFront → Create Distribution
2. Origin domain: `YOUR_BUCKET_NAME.s3.amazonaws.com`
3. Origin access: "Origin access control (OAC)" — attach an OAC and update the S3 bucket policy when prompted
4. Set `CLOUDFRONT_BASE_URL=https://dXXXXXXXXXXXX.cloudfront.net` in your `.env`
5. Restart PM2: `pm2 restart pixlink-api`

Images served via CloudFront will be cached globally; the redirect route in Express will point users to the CloudFront URL automatically.

---

## Common Maintenance Commands

```bash
# View live logs
pm2 logs pixlink-api

# Restart app after code changes
pm2 restart pixlink-api

# Pull latest code and redeploy
cd /home/ubuntu/pixlink
git pull
cd frontend && npm install && npm run build && cd ..
cd backend && npm install && cd ..
pm2 restart pixlink-api
sudo systemctl reload nginx

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log
```
