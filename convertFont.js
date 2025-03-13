import fs from "fs";

const fontFile = [
  "src/assets/NotoSansTC-Regular.ttf",
  "src/assets/NotoSansTC-Bold.ttf",

]
const outputFile = [
  "src/assets/NotoSansTC-Regular.js",
  "src/assets/NotoSansTC-Bold.js",
]

for (let i = 0; i < fontFile.length; i++) {
  fs.readFile(fontFile[i], (err, data) => {
    if (err) {
      console.error("無法讀取字型檔案", err);
    return;
  }

  const base64Font = data.toString("base64");
  const jsContent = `export default "${base64Font}";`;

  fs.writeFileSync(outputFile[i], jsContent, "utf8");
  console.log(`✅ 轉換成功！${outputFile[i]} 已生成。`);
  });
}
