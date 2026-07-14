import fs from "fs/promises";
import path from "path";


export const getImageUrl = (filename: string) => {
  return `/uploads/feed/${filename}`;
};



export async function deleteFile(filePath: string) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    await fs.unlink(fullPath);
  } catch (error) {
    console.warn("Delete file failed:", error);
  }
}