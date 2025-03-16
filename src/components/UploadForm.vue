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
      <div v-for="(domain, domainIndex) in domains" :key="domainIndex" class="domain-card">
        <h3>{{ domain.name }}</h3>
        <label class="file-label">
          <input type="file" accept="image/jpeg, image/png" @change="handleFileUpload($event, domainIndex)" multiple>
        </label>

        <div v-if="(domain.images || []).length" class="image-preview">
          <div v-for="(image, imgIndex) in domain.images || []" :key="imgIndex" class="image-container">
            <div class="image-wrapper">
              <img :src="image" alt="上傳圖片" width="200px" :style="{ transform: `rotate(${domain.rotation[imgIndex]}deg)` }">
            </div>
            <div class="image-actions">
              <button @click="rotateImage(domainIndex, imgIndex)" class="rotate-btn">
                <img src="@/assets/image-rotate.svg" alt="旋轉" width="26" height="26">
              </button>
              <button @click="removeImage(domainIndex, imgIndex)" class="delete-btn">
                <img src="@/assets/trash-can.svg" alt="刪除" width="30" height="30">
              </button>
            </div>
          </div>
        </div>
        <div class="alert alert-danger">最多只能上傳 2 張圖片</div>

        <textarea v-model="domain.description" @input="checkDescriptionLength(domain)" @blur="validateDescription(domain)" placeholder="請輸入發展領域說明" maxlength="80" rows="4"></textarea>

        <small v-if="domain.description.length >= 80" class="error">⚠️ 最多只能輸入 80 個字！</small>
      </div>
    </section>

    <!-- 遮蓋式彈出視窗 -->
    <div v-if="isGeneratingPDF || pdfGenerated" class="overlay">
      <div class="popup">
        <p>{{ popupMessage }}</p>
      </div>
    </div>
    <button class="pdf-button" @click="generatePDF">📄 產生 PDF</button>
  </div>
</template>

<script>
import { ref, nextTick, watch } from "vue";
import { jsPDF } from "jspdf";
// import { piexif } from 'piexifjs';
// import { ref, watch } from "vue";
// import { useImageProcessor } from "@/composables/useImageProcessor";
// import { usePDFGenerator } from "@/composables/usePDFGenerator";

export default {
  setup() {
    const unitName = ref(localStorage.getItem('unitName') || "");
    const month = ref(localStorage.getItem('month') || "");
    const recorder = ref(localStorage.getItem('recorder') || "");
    const className = ref(localStorage.getItem('className') || "");
    const domains = ref(JSON.parse(localStorage.getItem('domains')) || [
      { name: "身體動作", images: [], description: "", rotation: [] },
      { name: "社會情緒", images: [], description: "", rotation: [] },
      { name: "語言溝通", images: [], description: "", rotation: [] },
      { name: "認知探索", images: [], description: "", rotation: [] },
      { name: "生活自理", images: [], description: "", rotation: [] },
      { name: "教玩具操作 / 文化藝術", images: [], description: "", rotation: [] }
    ]);
    const isGeneratingPDF = ref(false);
    const pdfGenerated = ref(false);
    const popupMessage = ref("產生PDF中，請稍待片刻...");

    // const { handleFileUpload, rotateImage, removeImage } = useImageProcessor(domains);
    // const { generatePDF } = usePDFGenerator(unitName, month, recorder, className, domains, isGeneratingPDF, pdfGenerated, popupMessage);

    watch(unitName, (newVal) => {
      localStorage.setItem('unitName', newVal);
    });

    watch(month, (newVal) => {
      localStorage.setItem('month', newVal);
    });

    watch(recorder, (newVal) => {
      localStorage.setItem('recorder', newVal);
    });

    watch(className, (newVal) => {
      localStorage.setItem('className', newVal);
    });

    watch(domains, (newVal) => {
      localStorage.setItem('domains', JSON.stringify(newVal));
    }, { deep: true });

    const checkDescriptionLength = (domain) => {
      if (domain.description.length > 80) {
        alert("說明欄位最多 80 個字！");
        domain.description = domain.description.substring(0, 80);
      }
    };

    const validateDescription = (domain) => {
      if (!domain || !domain.description) return;

      if (domain.description.length > 80) {
        alert("說明欄位最多 80 個字！");
      }
    };

    const handleFileUpload = (event, domainIndex) => {
      const files = Array.from(event.target.files);
      if (!files.length) return;

      const allowedFormats = ["image/jpeg", "image/png", "image/jpg"];

      if (!domains.value[domainIndex].images) {
        domains.value[domainIndex].images = [];
      }

      let currentImages = domains.value[domainIndex].images.length;
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
        processImage(file, domainIndex);
      });
      event.target.value = null;
    };

    const processImage = (file, domainIndex) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // const imgData = e.target.result;
            // const exifObj = piexif.load(imgData);
            // const orientation = exifObj['0th'][piexif.ImageIFD.Orientation] || 1;

            const maxWidth = 800;
            const maxHeight = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;

            // 設置畫布尺寸和方向
            // setCanvasOrientation(ctx, orientation, width, height);

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              const url = URL.createObjectURL(blob);
              domains.value[domainIndex].images.push(url);
              domains.value[domainIndex].rotation.push(0);
            }, 'image/jpeg', 0.7);
          } catch (error) {
            console.error("Error reading EXIF data:", error);
            domains.value[domainIndex].images.push(img.src);
          }
        };
      };
      reader.readAsDataURL(file);
    };

    // const setCanvasOrientation = (ctx, orientation, width, height) => {
    //   switch (orientation) {
    //     case 2:
    //       ctx.transform(-1, 0, 0, 1, width, 0);
    //       break;
    //     case 3:
    //       ctx.transform(-1, 0, 0, -1, width, height);
    //       break;
    //     case 4:
    //       ctx.transform(1, 0, 0, -1, 0, height);
    //       break;
    //     case 5:
    //       ctx.transform(0, 1, 1, 0, 0, 0);
    //       break;
    //     case 6:
    //       ctx.transform(0, 1, -1, 0, height, 0);
    //       break;
    //     case 7:
    //       ctx.transform(0, -1, -1, 0, height, width);
    //       break;
    //     case 8:
    //       ctx.transform(0, -1, 1, 0, 0, width);
    //       break;
    //     default:
    //       ctx.transform(1, 0, 0, 1, 0, 0);
    //   }
    // };

    const rotateImage = (domainIndex, imgIndex) => {
      domains.value[domainIndex].rotation[imgIndex] = (domains.value[domainIndex].rotation[imgIndex] + 90) % 360;
    };

    const removeImage = (domainIndex, imgIndex) => {
      domains.value[domainIndex].images.splice(imgIndex, 1);
    };

    const getRotatedImage = (image, angle) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (angle === 90 || angle === 270) {
        canvas.width = image.height;
        canvas.height = image.width;
      } else {
        canvas.width = image.width;
        canvas.height = image.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);

      return canvas.toDataURL();
    };

    const loadFont = async (filename) => {
      const BASE_URL = import.meta.env.BASE_URL || "/";
      const url = `${BASE_URL}fonts/${filename}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to load font: ${url}`);

      const fontData = await response.arrayBuffer();
      const binaryString = new Uint8Array(fontData).reduce((acc, byte) => acc + String.fromCharCode(byte), "");

      return btoa(binaryString);
    };

    const generatePDF = async () => {
      isGeneratingPDF.value = true;
      pdfGenerated.value = false;
      popupMessage.value = "產生PDF中，請稍待片刻...";

      await nextTick();
      const pdf = new jsPDF("p", "mm", "a4");

      // 讀取 NotoSansTC 字體檔案
      const fontRegular = await loadFont("NotoSansTC-Regular.ttf");
      const fontBold = await loadFont("NotoSansTC-Bold.ttf");

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
      pdf.text(`單元名稱: ${unitName.value}`, 10, headerStartY + 15);
      let monthStartX = 70;
      let classStartX = 110;
      let recorderStartX = 150;

      pdf.text(`年月: ${month.value}`, monthStartX, headerStartY + 15);
      pdf.text(`班級: ${className.value}`, classStartX, headerStartY + 15);
      pdf.text(`記錄者: ${recorder.value}`, recorderStartX, headerStartY + 15);

      // 調整表格間距，減少紅框高度
      const startX = 10;
      const startY = headerStartY + 20; // 縮小這個值以減少紅框間距
      const columnWidths = [35, 85, 70]; // 發展領域、照片、說明
      const headHeight = 6; // 縮小表頭高度
      const rowHeight = 40;  // 保持其他列高度較大
      const tableWidth = columnWidths.reduce((acc, w) => acc + w, 0);
      const rowCount = domains.value.length;

      // 繪製表格框線
      pdf.setLineWidth(0.5);
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
        let domainText = pdf.splitTextToSize(domains.value[i].name, columnWidths[0] - 10);
        pdf.text(domainText, domainCenterX, textY, { align: "center", baseline: "middle" });

        // 插入說明
        let descriptionText = domains.value[i].description.substring(0, 60);
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

        let images = domains.value[i].images || [];

        for (let imgIndex = 0; imgIndex < images.length; imgIndex++) {
          let img = images[imgIndex];
          let format = img.includes("image/png") ? "PNG" : "JPEG";

          let imageObj = new Image();
          imageObj.src = img;
          await new Promise((resolve) => {
            imageObj.onload = () => {
              let rotatedImage = getRotatedImage(imageObj, domains.value[i].rotation[imgIndex]);

              let imgWidth = imageObj.width;
              let imgHeight = imageObj.height;

              if (domains.value[i].rotation[imgIndex] === 90 || domains.value[i].rotation[imgIndex] === 270) {
                [imgWidth, imgHeight] = [imgHeight, imgWidth];
              }

              if (imgWidth > imgMaxWidth) {
                imgHeight *= imgMaxWidth / imgWidth;
                imgWidth = imgMaxWidth;
              }
              if (imgHeight > imgMaxHeight) {
                imgWidth *= imgMaxHeight / imgHeight;
                imgHeight = imgMaxHeight;
              }

              let imgY = yPos + (rowHeight - imgHeight) / 2;
              let imgX = imgIndex === 0 ? imgXLeft : imgXRight;

              pdf.addImage(rotatedImage, format, imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');
              resolve();
            };
          });
        }
      }
      // 設定 PDF 檔名
      let filename = `發展領域記錄表-${month.value}-${className.value}-${recorder.value}.pdf`;
      pdf.save(filename);

      isGeneratingPDF.value = false;
      pdfGenerated.value = true;
      popupMessage.value = "PDF已完成，請自行下載。";

      unitName.value = "";
      month.value = "";
      recorder.value = "";
      className.value = "";
      domains.value.forEach(domain => {
        domain.images = [];
        domain.description = "";
        domain.rotation = [];
      });

      setTimeout(() => {
        pdfGenerated.value = false;
        popupMessage.value = "";
      }, 3000);
    };

    return {
      unitName,
      month,
      recorder,
      className,
      domains,
      isGeneratingPDF,
      pdfGenerated,
      popupMessage,
      checkDescriptionLength,
      validateDescription,
      handleFileUpload,
      rotateImage,
      removeImage,
      generatePDF
    }
  }
};
</script>