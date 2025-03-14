<template>
  <div class="container">
    <h1>六大發展領域記錄表</h1>

    <section class="card">
      <h2>Step 1: 填寫班級資料</h2>
      <div class="form-group">
        <label>單元名稱</label>
        <input type="text" v-model="unitName" maxlength="5" placeholder="輸入單元名稱">
        <div class="alert alert-info">最多只能輸入5個字</div>

        <label>年+月份</label>
        <input type="text" v-model="month" placeholder="輸入年+月份">
        <div class="alert alert-info">ex: 114年3月</div>

        <label>班級</label>
        <input type="text" v-model="className" placeholder="輸入班級">

        <label>記錄者</label>
        <input type="text" v-model="recorder" placeholder="輸入記錄者">
      </div>
    </section>

    <section class="card">
      <h2>Step 2: 上傳六大發展領域資料</h2>
      <div v-for="(domain, index) in domains" :key="index" class="domain-card">
        <h3>{{ domain.name }}</h3>
        <label class="file-label">
          <input type="file" accept="image/jpeg, image/png" @change="handleFileUpload($event, index)" multiple>
        </label>

        <div v-if="(domain.images || []).length" class="image-preview">
          <div v-for="(image, imgIndex) in domain.images || []" :key="imgIndex" class="image-wrapper">
            <img :src="image" alt="上傳圖片" width="200px">
            <button @click="removeImage(index, imgIndex)" class="delete-btn">
              🗑️
            </button>
          </div>
        </div>
        <div class="alert alert-danger">最多只能上傳 2 張圖片</div>

        <textarea v-model="domain.description" @input="checkDescriptionLength(domain)" @blur="validateDescription(domain)" placeholder="請輸入發展領域說明" maxlength="60" rows="3"></textarea>

        <small v-if="domain.description.length >= 60" class="error">⚠️ 最多只能輸入 60 個字！</small>
      </div>
    </section>

    <button class="pdf-button" @click="generatePDF">📄 產生 PDF</button>
  </div>
</template>

<script>
import { nextTick } from "vue";
import { jsPDF } from "jspdf";
import { EXIF } from "exif-js";

export default {
  data() {
    return {
      unitName: "",
      month: "",
      recorder: "",
      className: "",
      domains: [
        { name: "身體動作", image: [], description: "" },
        { name: "社會情緒", image: [], description: "" },
        { name: "語言溝通", image: [], description: "" },
        { name: "認知探索", image: [], description: "" },
        { name: "生活自理", image: [], description: "" },
        { name: "教玩具操作 / 文化藝術", image: [], description: "" }
      ]
    };
  },
  methods: {
    checkDescriptionLength(domain) {
      if (domain.description.length > 60) {
        alert("說明欄位最多 60 個字！");
        domain.description = domain.description.substring(0, 60);
      }
    },
    validateDescription(domain) {
      if (!domain || !domain.description) return;

      if (domain.description.length > 60) {
        alert("說明欄位最多 60 個字！");
      }
    },
    handleFileUpload(event, domainIndex) {
      const files = Array.from(event.target.files);
      if (!files.length) return;

      const allowedFormats = ["image/jpeg", "image/png", "image/jpg"];

      if (!this.domains[domainIndex].images) {
        this.domains[domainIndex].images = [];
      }

      let currentImages = this.domains[domainIndex].images.length;
      let remainingSlots = 2 - currentImages;

      if (currentImages >= 2) {
        alert("最多只能上傳 2 張圖片");
        return;
      }

      files.slice(0, remainingSlots).forEach((file) => {
        if (!allowedFormats.includes(file.type)) {
          alert("僅支援 JPG、JPEG、PNG 格式的圖片");
          event.target.value = "";
          return;
        };
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          img.onload = () => {
            EXIF.getData(img, () => {
              const orientation = EXIF.getTag(this, "Orientation");
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              canvas.width = img.width;
              canvas.height = img.height;

              switch (orientation) {
                case 2:
                  ctx.transform(-1, 0, 0, 1, img.width, 0);
                  break;
                case 3:
                  ctx.transform(-1, 0, 0, -1, img.width, img.height);
                  break;
                case 4:
                  ctx.transform(1, 0, 0, -1, 0, img.height);
                  break;
                case 5:
                  canvas.width = img.height;
                  canvas.height = img.width;
                  ctx.transform(0, 1, 1, 0, 0, 0);
                  break;
                case 6:
                  canvas.width = img.height;
                  canvas.height = img.width;
                  ctx.transform(0, 1, -1, 0, img.height, 0);
                  break;
                case 7:
                  canvas.width = img.height;
                  canvas.height = img.width;
                  ctx.transform(0, -1, -1, 0, img.height, img.width);
                  break;
                case 8:
                  canvas.width = img.height;
                  canvas.height = img.width;
                  ctx.transform(0, -1, 1, 0, 0, img.width);
                  break;
                default:
                  ctx.transform(1, 0, 0, 1, 0, 0);
              }

              ctx.drawImage(img, 0, 0, img.width, img.height);

              const rotatedDataUrl = canvas.toDataURL(file.type);
              this.domains[domainIndex].images.push(rotatedDataUrl);
            })
          };
        };
        reader.readAsDataURL(file);
      });

      event.target.value = null;
    },
    removeImage(domainIndex, imgIndex) {
      this.domains[domainIndex].images.splice(imgIndex, 1);
    },
    async loadFont(filename) {
      const BASE_URL = import.meta.env.BASE_URL || "/";
      const url = `${BASE_URL}fonts/${filename}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load font: ${url}`);

      const fontData = await response.arrayBuffer();
      const binaryString = new Uint8Array(fontData).reduce((acc, byte) => acc + String.fromCharCode(byte), "");

      return btoa(binaryString);
    },
    async generatePDF() {
      await nextTick();
      const pdf = new jsPDF("p", "mm", "a4");

      // 讀取 NotoSansTC 字體檔案
      const fontRegular = await this.loadFont("NotoSansTC-Regular.ttf");
      const fontBold = await this.loadFont("NotoSansTC-Bold.ttf");

      if (!fontRegular || !fontBold) {
        throw new Error("字體載入失敗，字體資料為空");
      }

      // 加入字體
      pdf.addFileToVFS("NotoSansTC-Regular.ttf", fontRegular);
      pdf.addFont("NotoSansTC-Regular.ttf", "NotoSansTC", "normal");
      pdf.addFileToVFS("NotoSansTC-Bold.ttf", fontBold);
      pdf.addFont("NotoSansTC-Bold.ttf", "NotoSansTC-Bold", "bold");

      pdf.setFont("NotoSansTC-Bold", "bold");
      // 縮小表頭間距
      let headerStartY = 15;
      pdf.setFontSize(18);
      pdf.text("臺北市私立長藤托嬰中心", 70, headerStartY);

      pdf.setFont("NotoSansTC", "normal");
      pdf.setFontSize(12);
      pdf.text(`單元名稱: ${this.unitName}`, 10, headerStartY + 15);
      let monthStartX = 70;
      let classStartX = 110;
      let recorderStartX = 150;

      pdf.text(`年月: ${this.month}`, monthStartX, headerStartY + 15);
      pdf.text(`班級: ${this.className}`, classStartX, headerStartY + 15);
      pdf.text(`記錄者: ${this.recorder}`, recorderStartX, headerStartY + 15);

      // 調整表格間距，減少紅框高度
      const startX = 10;
      const startY = headerStartY + 20; // 縮小這個值以減少紅框間距
      const columnWidths = [35, 85, 70]; // 發展領域、照片、說明
      const headHeight = 6; // 縮小表頭高度
      const rowHeight = 40;  // 保持其他列高度較大
      const tableWidth = columnWidths.reduce((acc, w) => acc + w, 0);
      const rowCount = this.domains.length;

      // 繪製表格框線
      pdf.setLineWidth(0.5);
      // pdf.rect(startX, startY, tableWidth, headHeight + rowHeight * rowCount);
      pdf.rect(startX, startY, columnWidths.reduce((acc, w) => acc + w, 0), 6 + rowHeight * rowCount);

      // 繪製表頭
      pdf.setFont("NotoSansTC-Bold", "bold");
      pdf.setFontSize(12);
      let domainCenterX = startX + columnWidths[0] / 2;
      let photoCenterX = startX + columnWidths[0] + columnWidths[1] / 2;
      let descriptionCenterX = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] / 2;

      let headerY = startY + headHeight - 1.5;

      pdf.text("發展領域", domainCenterX, headerY, { align: "center" });
      pdf.text("照片", photoCenterX, headerY, { align: "center" });
      pdf.text("說明", descriptionCenterX, headerY, { align: "center" });

      // 繪製表格列
      for (let i = 0; i < rowCount; i++) {
        let yPos = startY + headHeight + i * rowHeight;
        pdf.line(startX, yPos, startX + tableWidth, yPos);

        // 插入發展領域名稱
        pdf.setFont("NotoSansTC-Bold", "bold");
        pdf.setFontSize(12);
        let domainCenterX = startX + columnWidths[0] / 2;
        let textY = yPos + rowHeight / 2;
        let domainText = pdf.splitTextToSize(this.domains[i].name, columnWidths[0] - 10);
        pdf.text(domainText, domainCenterX, textY, { align: "center", baseline: "middle" });

        // 插入說明
        let descriptionText = this.domains[i].description.substring(0, 60);
        let descriptionWidth = columnWidths[2] - 4;
        let wrappedText = pdf.splitTextToSize(descriptionText, descriptionWidth);

        // 計算文字的 Y 位置 (垂直置中)
        let lineHeight = 7;
        let totalTextHeight = wrappedText.length * lineHeight;
        let textStartY = yPos + (rowHeight - totalTextHeight) / 2 + lineHeight / 2;

        // 計算文字的 X 位置 (水平置中)
        let textStartX = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] / 2;

        pdf.setFont("NotoSansTC", "normal");
        pdf.setFontSize(10);
        pdf.text(wrappedText, textStartX, textStartY, {
          align: "center",
          baseline: "middle",
        });
      }

      // 繪製縱向分隔線
      let xOffset = startX;
      for (let w of columnWidths) {
        xOffset += w;
        pdf.line(xOffset, startY, xOffset, startY + headHeight + rowHeight * rowCount);
      }

      for (let i = 0; i < rowCount; i++) {
        let yPos = startY + headHeight + i * rowHeight;
        let imgMaxWidth = columnWidths[1] / 2 - 3;
        let imgMaxHeight = rowHeight - 6;
        let imgXLeft = startX + columnWidths[0] + 2;
        let imgXRight = imgXLeft + imgMaxWidth + 1.5;

        let images = this.domains[i].images || [];

        for (let imgIndex = 0; imgIndex < images.length; imgIndex++) {
          let img = images[imgIndex];
          let format = img.includes("image/png") ? "PNG" : "JPEG";

          let imageObj = new Image();
          imageObj.src = img;
          await new Promise((resolve) => {
            imageObj.onload = () => {
              let aspectRatio = imageObj.width / imageObj.height;
              let imgWidth = imgMaxWidth;
              let imgHeight = imgMaxWidth / aspectRatio;
              if (imgHeight > imgMaxHeight) {
                imgHeight = imgMaxHeight;
                imgWidth = imgMaxHeight * aspectRatio;
              }
              let imgY = yPos + (rowHeight - imgHeight) / 2;
              let imgX = imgIndex === 0 ? imgXLeft : imgXRight;
              pdf.addImage(img, format, imgX, imgY, imgWidth, imgHeight);
              resolve();
            };
          });
        }
      }
      // 設定 PDF 檔名
      let filename = `發展領域記錄表-${this.month}-${this.recorder}.pdf`;
      pdf.save(filename);
    }
  }
};
</script>