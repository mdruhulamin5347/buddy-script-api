import fs from "fs/promises";
import path from "path";


export const getImageUrl = (filename: string) => {
  return `/uploads/feed/${filename}`;
};



export async function deleteFile(filePath: string) {
  try {
    const relativePath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    const fullPath = path.join(process.cwd(), relativePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.warn("Delete file failed:", error);
  }
}