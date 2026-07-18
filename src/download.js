import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// Saving exported files needs two paths:
// - Browser: a blob URL on a temporary <a download> link.
// - Native app (Capacitor): Android WebViews silently ignore blob-URL
//   downloads, so write the file with the Filesystem plugin and open the
//   system share sheet — the user can save it to Files, Drive, or send it
//   straight into a DAW app.

function toBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function downloadFile(bytes, filename, mime) {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: toBase64(bytes),
      directory: Directory.Cache,
    });
    try {
      await Share.share({ title: filename, files: [uri] });
    } catch {
      // User dismissed the share sheet — not an error.
    }
    return;
  }

  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
