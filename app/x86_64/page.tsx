import clientPromise from '@/lib/mongodb';
import Link from 'next/link';

export const revalidate = 0; // Disable static caching so the index is always fresh

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default async function RepoIndex() {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || 'alex-aur-packages');
  
  // Fetch all active packages from MongoDB
  const packages = await db.collection('packages').find({ status: 'active' }).toArray();

  return (
    <div className="min-h-screen bg-[#1e1e2e] text-[#cdd6f4] font-mono p-8 selection:bg-[#f5c2e7] selection:text-[#1e1e2e]">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#cba6f7] mb-2 flex items-center gap-4">
          Custom Arch Linux Mirror - Stormwing 🐉
        </h1>
        <p className="text-[#a6adc8] mb-8">Index of /repos/alex-repo/x86_64/</p>

        <div className="bg-[#181825] rounded-xl border border-[#313244] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#313244] text-[#f5c2e7] text-xs font-semibold tracking-wider">
                <th className="px-6 py-4 w-[55%]">NAME</th>
                <th className="px-6 py-4 w-[25%]">LAST MODIFIED</th>
                <th className="px-6 py-4 w-24 text-right">SIZE</th>
                <th className="px-6 py-4 w-24">TYPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#313244]/50">
              <tr className="hover:bg-[#313244]/30 transition-colors">
                <td className="px-6 py-3 font-bold text-[#89b4fa]">
                  <Link href="/" className="flex items-center gap-2">
                    <span className="text-[#cba6f7]">⬆</span> ../
                  </Link>
                </td>
                <td className="px-6 py-3 text-[#a6adc8]">-</td>
                <td className="px-6 py-3 text-right text-[#a6adc8]">-</td>
                <td className="px-6 py-3 text-[#a6adc8]">Directory</td>
              </tr>

              {/* Core Database Files */}
              {['alex-repo.db', 'alex-repo.db.tar.gz', 'alex-repo.files', 'alex-repo.files.tar.gz'].map((dbFile) => (
                <tr key={dbFile} className="hover:bg-[#313244]/30 transition-colors">
                  <td className="px-6 py-3">
                    <Link href={`/x86_64/${dbFile}`} className="text-[#89b4fa] hover:underline decoration-[#89b4fa]/50 underline-offset-4">
                      {dbFile}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-[#a6adc8]">Always Latest</td>
                  <td className="px-6 py-3 text-right text-[#a6adc8]">-</td>
                  <td className="px-6 py-3 text-[#a6adc8]">File</td>
                </tr>
              ))}

              {/* Dynamic Package Files from Database */}
              {packages.map((pkg) => {
                // Assume standard Arch naming convention. We can refine this later if needed.
                const pkgName = `${pkg.name}-${pkg.version}-1-x86_64.pkg.tar.zst`;
                const sigName = `${pkgName}.sig`;
                const date = new Date(pkg.lastBuilt || Date.now()).toISOString().replace('T', ' ').substring(0, 16);

                let pkgSizeStr = '-';
                let sigSizeStr = '-';
                if (pkg.assets && Array.isArray(pkg.assets)) {
                  const pkgAsset = pkg.assets.find((a: any) => a.name === pkgName);
                  if (pkgAsset) pkgSizeStr = formatBytes(pkgAsset.size);
                  
                  const sigAsset = pkg.assets.find((a: any) => a.name === sigName);
                  if (sigAsset) sigSizeStr = formatBytes(sigAsset.size);
                }

                return (
                  <>
                    <tr key={pkgName} className="hover:bg-[#313244]/30 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/x86_64/${pkgName}`} className="text-[#89b4fa] hover:underline decoration-[#89b4fa]/50 underline-offset-4">
                          {pkgName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-[#a6adc8]">{date}</td>
                      <td className="px-6 py-3 text-right text-[#a6adc8]">{pkgSizeStr}</td>
                      <td className="px-6 py-3 text-[#a6adc8]">File</td>
                    </tr>
                    <tr key={sigName} className="hover:bg-[#313244]/30 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/x86_64/${sigName}`} className="text-[#89b4fa] hover:underline decoration-[#89b4fa]/50 underline-offset-4">
                          {sigName}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-[#a6adc8]">{date}</td>
                      <td className="px-6 py-3 text-right text-[#a6adc8]">{sigSizeStr}</td>
                      <td className="px-6 py-3 text-[#a6adc8]">File</td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
          <div className="px-6 py-4 bg-[#11111b] border-t border-[#313244] text-xs text-[#a6adc8] flex justify-between">
            <span>Custom Arch Linux Mirror</span>
            <span>{packages.length * 2 + 4} Files Indexed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
