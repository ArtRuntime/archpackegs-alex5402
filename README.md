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

## Setup Instructions

### 1. Import the GPG Key (Required for Security)

Because the repository is cryptographically signed, Pacman needs to know your public key to verify the packages. Since your key is private and not on a public keyserver, you must add it to Pacman's keyring manually:

```bash
# 1. Export your public key from your user's GPG vault
gpg --export 85973202A05F1B3C44B2405738E33F18B009C9A7 > alex-repo.pub

# 2. Add the key to Pacman's root keyring
sudo pacman-key --add alex-repo.pub

# 3. Locally sign the key to tell Pacman it is trusted
sudo pacman-key --lsign-key 85973202A05F1B3C44B2405738E33F18B009C9A7
```

### 2. Configure Pacman

Open `/etc/pacman.conf` in your favorite editor with sudo privileges:
```bash
sudo nano /etc/pacman.conf
```

Add the following block to the **bottom** of the file:

```ini
[alex-repo]
SigLevel = Required DatabaseOptional
Server = https://archpackegs-alex5402.vercel.app/api/download?file=$repo.db.tar.gz
```

### 3. Sync and Install

Finally, synchronize the databases and install packages normally!

```bash
# Sync databases
sudo pacman -Sy

# Install a tracked package
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
