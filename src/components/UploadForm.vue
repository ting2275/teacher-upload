<template>
  <div class="container">
    <h1>六大發展領域記錄表</h1>

    <section class="card">
      <h2>Step 1: 填寫班級資料</h2>
      <div class="form-group">
        <label>單元名稱</label>
        <input type="text" v-model="unitName" maxlength="5" placeholder="輸入單元名稱">
        <small class="error">最多只能輸入5個字</small>

        <label>年+月份</label>
        <input type="text" v-model="month" placeholder="輸入年+月份">
        <small class="example">ex: 114年3月</small>

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
          <input type="file" accept="image/jpeg, image/png" @change="handleFileUpload($event, index)">
        </label>

        <div v-if="domain.image" class="image-preview">
          <img :src="domain.image" alt="上傳圖片" width="200px">
          <button @click="removeImage(index)" class="delete-btn">
            🗑️
          </button>
        </div>

        <textarea v-model="domain.description" @input="checkDescriptionLength" @blur="validateDescription" placeholder="請輸入發展領域說明" maxlength="60" rows="3"></textarea>
        <small v-if="domain.description.length >= 60" class="error">⚠️ 最多只能輸入 60 個字！</small>
      </div>
    </section>

    <button class="pdf-button" @click="generatePDF">📄 產生 PDF</button>
  </div>
</template>

<script>
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import font from "../assets/NotoSansTC-Regular.js";
import fontBold from "../assets/NotoSansTC-Bold.js";
import { nextTick } from "vue";

export default {
  data() {
    return {
      unitName: "",
      month: "",
      recorder: "",
      className: "",
      domains: [
        { name: "身體動作", image: null, description: "" },
        { name: "社會情緒", image: null, description: "" },
        { name: "語言溝通", image: null, description: "" },
        { name: "認知探索", image: null, description: "" },
        { name: "生活自理", image: null, description: "" },
        { name: "教玩具操作 / 文化藝術", image: null, description: "" }
      ]
    };
  },
  methods: {
    checkDescriptionLength() {
      if (this.description.length > 60) {
        alert("說明欄位最多 60 個字！");
        this.description = this.description.substring(0, 60);
      }
    },
    validateDescription() {
      if (this.description.length > 60) {
        alert("說明欄位最多 60 個字！");
        return;
      }
    },
    handleFileUpload(event, domainIndex) {
      const file = event.target.files[0];
      if (!file) return;

      const allowedFormats = ["image/jpeg", "image/png", "image/jpg"];
      if (!allowedFormats.includes(file.type)) {
        alert("僅支援 JPG、JPEG、PNG 格式的圖片");
        event.target.value = "";
        return;
      }

      if (this.domains[domainIndex].image) {
        alert("每個發展領域只能上傳 1 張圖片，請先移除後再上傳");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        this.domains[domainIndex].image = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    removeImage(domainIndex) {
      this.domains[domainIndex].image = null;
    },
    async generatePDF() {
      await nextTick();

      const pdf = new jsPDF("p", "mm", "a4");

      // 設定中文字型，確保 PDF 顯示正確
      pdf.addFileToVFS("NotoSansTC-Regular.ttf", font);
      pdf.addFont("NotoSansTC-Regular.ttf", "NotoSansTC", "normal");
      pdf.addFileToVFS("NotoSansTC-Bold.ttf", fontBold);
      pdf.addFont("NotoSansTC-Bold.ttf", "NotoSansTC-Bold", "normal");

      pdf.setFont("NotoSansTC-Bold");
      // 縮小表頭間距
      let headerStartY = 15;
      pdf.setFontSize(18);
      pdf.text("臺北市私立長藤托嬰中心", 70, headerStartY);

      pdf.setFont("NotoSansTC");
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
      pdf.rect(startX, startY, tableWidth, headHeight + rowHeight * rowCount);

      // 繪製表頭
      pdf.setFont("NotoSansTC-Bold");
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
        pdf.setFont("NotoSansTC-Bold");
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

        pdf.setFont("NotoSansTC");
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

      // 插入圖片
      for (let i = 0; i < rowCount; i++) {
        let yPos = startY + headHeight + i * rowHeight;
        let imgMaxWidth = columnWidths[1] - 6;
        let imgMaxHeight = rowHeight - 6;
        let imgWidth, imgHeight;

        if (this.domains[i].image) {
          let img = this.domains[i].image;

          let format = "";
          if (img.startsWith("data:image/png")) format = "PNG";
          if (img.startsWith("data:image/jpg") || img.startsWith("data:image/jpeg")) format = "JPEG";

          if (!format) {
            alert("圖片格式不正確，僅支援 JPG、JPEG、PNG 格式的圖片");
            return;
          }

          console.log("圖片格式:", format);

          // 確保圖片等比例縮放
          let imageObj = new Image();
          imageObj.src = img;
          await new Promise((resolve) => {
            imageObj.onload = () => {
              let aspectRatio = imageObj.width / imageObj.height;
              if (imgMaxWidth / aspectRatio > imgMaxHeight) {
                imgHeight = imgMaxHeight;
                imgWidth = imgMaxHeight * aspectRatio;
              } else {
                imgWidth = imgMaxWidth;
                imgHeight = imgMaxWidth / aspectRatio;
              }
              resolve();
            };
          });

          console.log("圖片尺寸:", { imgWidth, imgHeight });

          let imgX = startX + columnWidths[0] + (columnWidths[1] - imgWidth) / 2;
          let imgY = yPos + (rowHeight - imgHeight) / 2;

          pdf.addImage(img, format, imgX, imgY, imgWidth, imgHeight);
        }
      }
      // 設定 PDF 檔名
      let filename = `發展領域記錄表-${this.month}-${this.recorder}.pdf`;
      pdf.save(filename);
    }
  }
};
</script>

<style scoped>

</style>