import { nextTick } from "vue";
import { jsPDF } from "jspdf";

export function usePDFGenerator(unitName, month, recorder, className, domains, isGeneratingPDF, pdfGenerated, popupMessage) {
  const loadFont = async (filename) => {
    const BASE_URL = import.meta.env.BASE_URL || "/";
    const url = `${BASE_URL}fonts/${filename}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load font: ${url}`);

    const fontData = await response.arrayBuffer();
    const binaryString = new Uint8Array(fontData).reduce((acc, byte) => acc + String.fromCharCode(byte), "");

    return btoa(binaryString);
  };

  const loadFonts = async () => {
    const fontRegular = await loadFont("NotoSansTC-Regular.ttf");
    const fontBold = await loadFont("NotoSansTC-Bold.ttf");

    if (!fontRegular || !fontBold) {
      throw new Error("字體載入失敗，字體資料為空");
    }

    return { fontRegular, fontBold };
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

  let headerStartY = 15;
  let startX = 10;
  let startY = headerStartY + 20;
  let columnWidths = [35, 85, 70];
  let rowHeight = 40;
  const headHeight = 6;
  const tableWidth = columnWidths.reduce((acc, w) => acc + w, 0);
  const rowCount = domains.value.length;

  const drawHeader = (pdf, unitName, month, className, recorder) => {
    pdf.setFont("NotoSansTC-Bold", "bold");
    pdf.setFontSize(18);
    pdf.text("臺北市私立長藤托嬰中心", 70, headerStartY);

    pdf.setFont("NotoSansTC", "normal");
    pdf.setFontSize(12);
    pdf.text(`單元名稱: ${unitName.value}`, 10, headerStartY + 15);
    pdf.text(`年月: ${month.value}`, 70, headerStartY + 15);
    pdf.text(`班級: ${className.value}`, 110, headerStartY + 15);
    pdf.text(`記錄者: ${recorder.value}`, 150, headerStartY + 15);
  };

  const drawTable = (pdf, domains) => {
    pdf.setLineWidth(0.5);
    pdf.rect(startX, startY, tableWidth, headHeight + rowHeight * rowCount);
    let domainCenterX = startX + columnWidths[0] / 2;
    let photoCenterX = startX + columnWidths[0] + columnWidths[1] / 2;
    let descriptionCenterX = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] / 2;
    let headerY = startY + headHeight - 1.5;

    pdf.text("發展領域", domainCenterX, headerY, { align: "center" });
    pdf.text("照片", photoCenterX, headerY, { align: "center" });
    pdf.text("說明", descriptionCenterX, headerY, { align: "center" });

    for (let i = 0; i < rowCount; i++) {
      let yPos = startY + headHeight + i * rowHeight;

      let domainText = pdf.splitTextToSize(domains.value[i].name, columnWidths[0] - 10);
      let domainStartX = startX + columnWidths[0] / 2;
      let domainCenterY = yPos + rowHeight / 2;

      pdf.line(startX, yPos, startX + tableWidth, yPos);
      addDomainName(pdf, domainText, domainStartX, domainCenterY);

      let descriptionWidth = columnWidths[2] - 7;
      let wrappedText = pdf.splitTextToSize(domains.value[i].description, descriptionWidth);
      let lineHeight = 7.5;
      let totalTextHeight = wrappedText.length * lineHeight;
      let descriptionStartX = startX + columnWidths[0] + columnWidths[1] + 3;
      let descriptionCenterY = yPos + (rowHeight - totalTextHeight) / 2 + lineHeight / 2;
      addDescription(pdf, wrappedText, descriptionStartX, descriptionCenterY);
    }

    let xOffset = startX;
    for (let w of columnWidths) {
      xOffset += w;
      pdf.line(xOffset, startY, xOffset, startY + headHeight + rowHeight * rowCount);
    }
  }

  // 插入發展領域名稱
  const addDomainName = (pdf, domainText, x, y) => {
    pdf.setFont("NotoSansTC-Bold", "bold");
    pdf.setFontSize(12);
    pdf.text(domainText, x, y, {
      align: "center",
      baseline: "middle"
    });
  }

  // 插入說明
  const addDescription = (pdf, wrappedText, x, y) => {
    pdf.setFont("NotoSansTC", "normal");
    pdf.setFontSize(12);
    pdf.text(wrappedText, x, y, {
      align: "left",
      baseline: "top",
    });
  }

  // 處理並插入照片
  const processImages = async (pdf, domains, startX, startY, rowHeight, columnWidths) => {
    console.log(domains.value[0].images);
    const rowCount = domains.value.length;
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

        // let imageObj = new Image();
        // imageObj.src = img;
        await new Promise((resolve) => {
          fetch(img)
            .then(response => response.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.onload = () => {
                const base64data = reader.result;
                const imageObj = new Image();
                imageObj.src = base64data;

                console.log(imageObj);
                imageObj.onload = () => {
                  let imgWidth = imageObj.width;
                  let imgHeight = imageObj.height;

                  let rotatedImage = getRotatedImage(imageObj, domains.value[i].rotation[imgIndex]);

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
                  // let imgX = 0;
                  pdf.addImage(rotatedImage, format, imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');
                  resolve();
                };
              };
              reader.readAsDataURL(blob);
            })
            .catch(error => {
              console.error('圖片載入失敗', img);
              resolve();
            });
        });
      }
    }
  }

  const generatePDF = async () => {
    isGeneratingPDF.value = true;
    pdfGenerated.value = false;
    popupMessage.value = "產生PDF中，請稍待片刻...";

    await nextTick();
    const pdf = new jsPDF("p", "mm", "a4");

    const { fontRegular, fontBold } = await loadFonts();

    // 加入字體
    pdf.addFileToVFS("NotoSansTC-Regular.ttf", fontRegular);
    pdf.addFont("NotoSansTC-Regular.ttf", "NotoSansTC", "normal");
    pdf.addFileToVFS("NotoSansTC-Bold.ttf", fontBold);
    pdf.addFont("NotoSansTC-Bold.ttf", "NotoSansTC-Bold", "bold");

    drawHeader(pdf, unitName, month, className, recorder);
    drawTable(pdf, domains);
    processImages(pdf, domains, startX, startY, rowHeight, columnWidths);

    // pdf.setFont("NotoSansTC-Bold", "bold");
    // // 縮小表頭間距
    // let headerStartY = 15;
    // pdf.setFontSize(18);
    // pdf.text("臺北市私立長藤托嬰中心", 70, headerStartY);

    // pdf.setFont("NotoSansTC", "normal");
    // pdf.setFontSize(12);
    // pdf.text(`單元名稱: ${unitName.value}`, 10, headerStartY + 15);
    // let monthStartX = 70;
    // let classStartX = 110;
    // let recorderStartX = 150;

    // pdf.text(`年月: ${month.value}`, monthStartX, headerStartY + 15);
    // pdf.text(`班級: ${className.value}`, classStartX, headerStartY + 15);
    // pdf.text(`記錄者: ${recorder.value}`, recorderStartX, headerStartY + 15);

    // // 調整表格間距，減少紅框高度
    // const startX = 10;
    // const startY = headerStartY + 20;
    // const columnWidths = [35, 85, 70];
    // const headHeight = 6;
    // const rowHeight = 40;
    // const tableWidth = columnWidths.reduce((acc, w) => acc + w, 0);
    // const rowCount = domains.value.length;

    // // 繪製表格框線
    // pdf.setLineWidth(0.5);
    // pdf.rect(startX, startY, columnWidths.reduce((acc, w) => acc + w, 0), 6 + rowHeight * rowCount);

    // // 繪製表頭
    // pdf.setFont("NotoSansTC-Bold", "bold");
    // pdf.setFontSize(12);
    // let domainCenterX = startX + columnWidths[0] / 2;
    // let photoCenterX = startX + columnWidths[0] + columnWidths[1] / 2;
    // let descriptionCenterX = startX + columnWidths[0] + columnWidths[1] + columnWidths[2] / 2;

    // let headerY = startY + headHeight - 1.5;

    // pdf.text("發展領域", domainCenterX, headerY, { align: "center" });
    // pdf.text("照片", photoCenterX, headerY, { align: "center" });
    // pdf.text("說明", descriptionCenterX, headerY, { align: "center" });

    // // 繪製表格列
    // for (let i = 0; i < rowCount; i++) {
    //   let yPos = startY + headHeight + i * rowHeight;
    //   pdf.line(startX, yPos, startX + tableWidth, yPos);

    //   // 插入發展領域名稱
    //   pdf.setFont("NotoSansTC-Bold", "bold");
    //   pdf.setFontSize(12);
    //   let domainCenterX = startX + columnWidths[0] / 2;
    //   let textY = yPos + rowHeight / 2;
    //   let domainText = pdf.splitTextToSize(domains.value[i].name, columnWidths[0] - 10);
    //   pdf.text(domainText, domainCenterX, textY, { align: "center", baseline: "middle" });

    //   // 插入說明
    //   let descriptionText = domains.value[i].description.substring(0, 80);
    //   let descriptionWidth = columnWidths[2] - 7;
    //   let wrappedText = pdf.splitTextToSize(descriptionText, descriptionWidth);

    //   // 計算文字的 Y 位置 (垂直置中)
    //   let lineHeight = 7.5;
    //   let totalTextHeight = wrappedText.length * lineHeight;
    //   let textStartY = yPos + (rowHeight - totalTextHeight) / 2 + lineHeight / 2;

    //   // 計算文字的 X 位置 (置左)
    //   let textStartX = startX + columnWidths[0] + columnWidths[1] + 3;

    //   pdf.setFont("NotoSansTC", "normal");
    //   pdf.setFontSize(12);
    //   pdf.text(wrappedText, textStartX, textStartY, {
    //     align: "left",
    //     baseline: "top",
    //   });
    // }

    // // 繪製縱向分隔線
    // let xOffset = startX;
    // for (let w of columnWidths) {
    //   xOffset += w;
    //   pdf.line(xOffset, startY, xOffset, startY + headHeight + rowHeight * rowCount);
    // }

    // for (let i = 0; i < rowCount; i++) {
    //   let yPos = startY + headHeight + i * rowHeight;
    //   let imgMaxWidth = columnWidths[1] / 2 - 3;
    //   let imgMaxHeight = rowHeight - 6;
    //   let imgXLeft = startX + columnWidths[0] + 2;
    //   let imgXRight = imgXLeft + imgMaxWidth + 1.5;

    //   let images = domains.value[i].images || [];

    //   for (let imgIndex = 0; imgIndex < images.length; imgIndex++) {
    //     let img = images[imgIndex];
    //     let format = img.includes("image/png") ? "PNG" : "JPEG";

    //     let imageObj = new Image();
    //     imageObj.src = img;
    //     await new Promise((resolve) => {
    //       imageObj.onload = () => {
    //         let rotatedImage = getRotatedImage(imageObj, domains.value[i].rotation[imgIndex]);

    //         let imgWidth = imageObj.width;
    //         let imgHeight = imageObj.height;

    //         if (domains.value[i].rotation[imgIndex] === 90 || domains.value[i].rotation[imgIndex] === 270) {
    //           [imgWidth, imgHeight] = [imgHeight, imgWidth];
    //         }

    //         if (imgWidth > imgMaxWidth) {
    //           imgHeight *= imgMaxWidth / imgWidth;
    //           imgWidth = imgMaxWidth;
    //         }
    //         if (imgHeight > imgMaxHeight) {
    //           imgWidth *= imgMaxHeight / imgHeight;
    //           imgHeight = imgMaxHeight;
    //         }

    //         let imgY = yPos + (rowHeight - imgHeight) / 2;
    //         let imgX = imgIndex === 0 ? imgXLeft : imgXRight;

    //         pdf.addImage(rotatedImage, format, imgX, imgY, imgWidth, imgHeight, undefined, 'FAST');
    //         resolve();
    //       };
    //     });
    //   }
    // }

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
    generatePDF,
  };
}