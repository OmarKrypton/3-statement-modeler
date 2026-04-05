/**
 * Robust file downloader that uses native system "Save As" dialog in Tauri,
 * or falls back to a standard browser download link otherwise.
 */
export async function downloadFile(
  data: Blob | Uint8Array,
  defaultFilename: string,
  extension: string
) {
  // Detect if we are running inside the Tauri shell
  const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;

  if (isTauri) {
    try {
      console.log("[Tauri] Using native File System / Dialog plugins.");
      
      // Dynamic imports to prevent issues in non-Tauri environments during build/SSR
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");

      // 1. Open the native OS Save Dialog
      const filePath = await save({
        defaultPath: defaultFilename,
        filters: [{
          name: extension.toUpperCase(),
          extensions: [extension.replace(".", "")]
        }]
      });

      if (!filePath) {
        console.log("[Tauri] User cancelled save dialog.");
        return;
      }

      // 2. Convert data to Uint8Array for the FS plugin
      let buffer: Uint8Array;
      if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        buffer = new Uint8Array(arrayBuffer);
      } else {
        buffer = data;
      }

      // 3. Write the file to the chosen path
      await writeFile(filePath, buffer);
      console.log(`[Tauri] File saved successfully to: ${filePath}`);
    } catch (error) {
      console.error("[Tauri] Native save failed:", error);
      console.log("[Tauri] Falling back to browser download...");
      browserFallback(data, defaultFilename);
    }
  } else {
    console.log("[Tauri] Not in Tauri environment. Using browser download fallback.");
    browserFallback(data, defaultFilename);
  }
}

function browserFallback(data: Blob | Uint8Array, filename: string) {
  const blob = data instanceof Blob ? data : new Blob([data as any]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
