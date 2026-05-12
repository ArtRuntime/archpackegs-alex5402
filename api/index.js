export default function handler(req, res) {
  const { url } = req;
  
  // url will be something like /x86_64/android-studio-alex-2025.3.2.6-1-x86_64.pkg.tar.zst
  // or /x86_64/alex-repo.db
  const filename = url.split('/').pop();

  if (!filename) {
    return res.status(400).send("Bad Request");
  }

  // Handle repository database requests (.db, .files, and their .sig variants)
  if (filename.startsWith('alex-repo.db') || filename.startsWith('alex-repo.files')) {
    // Redirect directly to the latest release for databases
    return res.redirect(302, `https://github.com/honeypie112/android-studio-alex/releases/latest/download/${filename}`);
  }

  // Handle packages and their signatures
  if (filename.startsWith('android-studio-alex-')) {
    // Extract version. 
    // Format: android-studio-alex-<VERSION>-<PKGREL>-<ARCH>.pkg.tar.zst[.sig]
    // Example: android-studio-alex-2025.3.2.6-1-x86_64.pkg.tar.zst
    const match = filename.match(/android-studio-alex-(.+?)-\d+-(?:x86_64|any)\.pkg\.tar\.(?:zst|xz)(?:\.sig)?/);
    
    if (match && match[1]) {
      const version = match[1];
      // Redirect to the specific release tag ensuring robustness against outdated local databases
      return res.redirect(302, `https://github.com/honeypie112/android-studio-alex/releases/download/v${version}/${filename}`);
    } else {
      // Fallback if version parsing fails
      return res.redirect(302, `https://github.com/honeypie112/android-studio-alex/releases/latest/download/${filename}`);
    }
  }

  // Default fallback for unknown files
  return res.status(404).send("Not Found");
}
