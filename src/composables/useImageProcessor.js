import { piexif } from 'piexifjs';

export function useImageProcessor(domains) {
  const handleFileUpload = (event, domainIndex) => {
    console.log(domains.value);
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
          const imgData = e.target.result;
          const exifObj = piexif.load(imgData);
          const orientation = exifObj['0th'][piexif.ImageIFD.Orientation] || 1;

          let width = img.width;
          let height = img.height;

          const maxWidth = 800;
          const maxHeight = 800;

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

  return {
    handleFileUpload,
    rotateImage,
    removeImage,
  };
}