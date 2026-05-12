<h1 align="center">Custom Arch Linux Mirror 🐉</h1>

<p align="center">
  <strong>A fully automated, self-hosted, serverless Arch Linux package repository and management dashboard.</strong>
</p>

## Overview

This Custom Arch Linux Mirror is an ultra-modern, automated system designed to host and manage custom Arch Linux packages (AUR). Instead of relying on traditional, stateful package servers, this architecture entirely decouples the build process from the hosting process using **Next.js**, **MongoDB**, and **GitHub Actions/Releases**.

### 🌟 Key Features

- **Decoupled Architecture:** Heavy lifting (building packages) is done by GitHub Actions. Hosting (delivering large `.pkg.tar.zst` files) is offloaded to GitHub Releases. The Next.js app acts solely as an ultra-fast routing proxy and management interface.
- **Dynamic Pacman Proxy:** Seamlessly routes Pacman requests (e.g., `pacman -S google-chrome`) directly to specific GitHub releases.
- **Beautiful Visual Index:** A completely dynamic, auto-generated public `/x86_64` directory listing that perfectly mimics the look of standard Arch Linux mirrors (e.g., Chaotic-AUR).
- **Secure Management Dashboard:** A premium, dark-themed, glassmorphic UI to track packages, trigger syncs, and manage repository state.
- **First-User Authentication System:** The system automatically locks registration after the first admin signs up, ensuring absolute security without manual backend configuration.

## System Architecture

1. **Build Farm (GitHub Actions):** Dedicated repositories containing `PKGBUILD.template` and a Python scraper. GitHub Actions run on a cron schedule to check for upstream updates, compile the packages inside Arch Docker containers, sign them, and attach the `.pkg.tar.zst` binaries to GitHub Releases.
2. **Metadata Store (MongoDB):** Tracks which packages are active, their source GitHub repositories, and their latest versions.
3. **Control Plane (Next.js):** The central hub. It provides the admin dashboard and exposes the proxy route (`/x86_64/...`) that the `pacman` package manager consumes.

## Getting Started

## Arch Linux Client Configuration

To use your custom mirror on any Arch Linux machine, you just need to edit your pacman configuration file!

1. Open your terminal and edit the configuration file with root privileges:
   ```bash
   sudo nano /etc/pacman.conf
   ```

2. Scroll all the way down to the very bottom of the file and append your custom repository. Because your database files are named `alex-repo.db`, the repository name **must** be `[alex-repo]`.

   Add these exact lines:
   ```ini
   [alex-repo]
   Server  = https://archpackegs-alex5402.vercel.app/$arch
   ```
   > **Note:** We set `SigLevel = Never` for testing. Once you export and distribute your GPG Public Key to your machines, you can change this to enforce strict signature checking (`Required DatabaseOptional`).

3. Save the file. Now, just sync your databases like you normally would:
   ```bash
   sudo pacman -Sy
   sudo pacman -S android-studio-alex
   ```


### Prerequisites
- Node.js (v18+)
- MongoDB Cluster (e.g., MongoDB Atlas)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd archpackegs-alex5402
   ```

2. **Set up Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net
   DB_NAME=alex-aur-packages
   ```

3. **Install dependencies and run:**
   ```bash
   npm install
   npm run dev
   ```
   Navigate to `http://localhost:3000/login` to create your initial admin account!

### Deployment with Docker

You can easily self-host the Next.js control plane using the provided Dockerfile.

```bash
docker build -t nexpanel-arch .
docker run -p 3000:3000 -e MONGODB_URI="your_uri" -e DB_NAME="your_db_name" nexpanel-arch
```

## Security

- Session management uses `HttpOnly` encrypted cookies.
- Password hashing via `bcryptjs`.
- Registration endpoint strictly locks after the first admin is created. You can update your credentials dynamically from the Settings gear in the dashboard.

## Built With
- **Next.js 14**
- **Tailwind CSS**
- **MongoDB**
- **Lucide Icons**
