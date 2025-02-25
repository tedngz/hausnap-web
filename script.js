document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);

// Google Vision API key
const VISION_API_KEY = 'AIzaSyBLhYy2wvSIqtOn3VOh98CTJHN6mp48MMI';
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('photoPreview');
            if (!preview) {
                console.error('Photo preview element not found');
                return;
            }
            preview.src = e.target.result;
            preview.style.display = 'block';
            generateDescription(file, e.target.result);
        };
        reader.readAsDataURL(file);
    } else {
        console.log('No file selected');
    }
}

async function generateDescription(file, imageData) {
    const descriptionText = document.getElementById('descriptionText');
    if (!descriptionText) {
        console.error('Description text element not found');
        return;
    }

    const base64Image = imageData.split(',')[1];
    const requestBody = {
        requests: [
            {
                image: { content: base64Image },
                features: [
                    { type: 'LABEL_DETECTION', maxResults: 10 },
                    { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
                ]
            }
        ]
    };

    try {
        console.log('Sending request to Vision API...');
        const response = await fetch(VISION_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Vision API request failed with status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Vision API response:', data);

        if (data.responses && data.responses[0]) {
            const labels = (data.responses[0].labelAnnotations || []).map(label => label.description.toLowerCase());
            const objects = (data.responses[0].localizedObjectAnnotations || []).map(obj => obj.name.toLowerCase());
            const allFeatures = [...new Set([...labels, ...objects])];
            console.log('Detected features:', allFeatures);

            // Language-specific content (hardcoded)
            const languages = {
                en: {
                    catchyPhrases: [
                        "Live the dream in this stunning space!",
                        "Your perfect retreat awaits!",
                        "Step into luxury with this gem!"
                    ],
                    roomTypes: { room: 'room', bedroom: 'bedroom', kitchen: 'kitchen', livingRoom: 'living room' },
                    featureMap: {
                        bed: ['luxurious king-sized bed', 'spacious walk-in closet', 'soft recessed lighting', 'plush carpeting'],
                        kitchen: ['state-of-the-art stainless steel appliances', 'elegant granite countertops', 'deep farmhouse sink', 'ample cabinet storage'],
                        livingRoom: ['plush sectional sofa', 'expansive floor-to-ceiling windows', 'sleek hardwood flooring', 'modern entertainment center'],
                        default: ['tasteful contemporary decor', 'bright natural light', 'versatile open layout', 'chic wall accents']
                    },
                    template: (catchy, roomType, features, extra) =>
                        `${catchy}\n\n` +
                        `Welcome to this breathtaking ${roomType}, where elegance meets comfort. Featuring ${features}, ` +
                        `this space offers a perfect blend of style and functionality. Enjoy ${extra} that elevate the experience. ` +
                        `Ideal for unwinding after a long day or hosting unforgettable gatherings.\n\n` +
                        `Listing Details:\n` +
                        `- Price: $1,200/month (adjust as needed)\n` +
                        `- Space: Approximately 400 sq ft\n` +
                        `- Amenities: High-speed Wi-Fi, central heating/cooling, nearby parking`
                },
                vi: {
                    catchyPhrases: [
                        "Sống trong giấc mơ với không gian tuyệt đẹp này!",
                        "Nơi nghỉ ngơi hoàn hảo đang chờ đón bạn!",
                        "Bước vào sự sang trọng với viên ngọc này!"
                    ],
                    roomTypes: { room: 'phòng', bedroom: 'phòng ngủ', kitchen: 'nhà bếp', livingRoom: 'phòng khách' },
                    featureMap: {
                        bed: ['giường king-size sang trọng', 'tủ quần áo rộng rãi', 'đèn chiếu sáng dịu nhẹ', 'thảm êm ái'],
                        kitchen: ['thiết bị thép không gỉ hiện đại', 'mặt bàn đá granite thanh lịch', 'bồn rửa kiểu farmhouse sâu', 'tủ đựng đồ rộng rãi'],
                        livingRoom: ['ghế sofa dài êm ái', 'cửa sổ lớn từ sàn đến trần', 'sàn gỗ cứng bóng bẩy', 'trung tâm giải trí hiện đại'],
                        default: ['trang trí hiện đại tinh tế', 'ánh sáng tự nhiên rực rỡ', 'bố cục mở linh hoạt', 'điểm nhấn tường sang trọng']
                    },
                    template: (catchy, roomType, features, extra) =>
                        `${catchy}\n\n` +
                        `Chào mừng bạn đến với ${roomType} tuyệt đẹp này, nơi sự thanh lịch hòa quyện với sự thoải mái. Nổi bật với ${features}, ` +
                        `không gian này mang đến sự kết hợp hoàn hảo giữa phong cách và tiện nghi. Tận hưởng ${extra} nâng tầm trải nghiệm. ` +
                        `Lý tưởng để thư giãn sau một ngày dài hoặc tổ chức những buổi tụ họp đáng nhớ.\n\n` +
                        `Chi tiết niêm yết:\n` +
                        `- Giá: $1,200/tháng (điều chỉnh nếu cần)\n` +
                        `- Diện tích: Khoảng 400 sq ft\n` +
                        `- Tiện ích: Wi-Fi tốc độ cao, điều hòa/lò sưởi trung tâm, bãi đỗ xe gần đó`
                }
            };

            // Determine room type and features
            let roomKey = 'room';
            if (allFeatures.includes('bed')) roomKey = 'bed';
            else if (allFeatures.includes('oven') || allFeatures.includes('sink')) roomKey = 'kitchen';
            else if (allFeatures.includes('sofa') || allFeatures.includes('television')) roomKey = 'livingRoom';

            const generateDesc = (lang) => {
                const langData = languages[lang];
                const catchy = langData.catchyPhrases[Math.floor(Math.random() * langData.catchyPhrases.length)];
                const roomType = langData.roomTypes[roomKey === 'room' ? 'room' : roomKey];
                const featureOptions = langData.featureMap[roomKey] || langData.featureMap.default;
                const detailedFeatures = featureOptions.filter(f => allFeatures.some(af => f.includes(af)) || Math.random() > 0.3);
                const featureString = detailedFeatures.slice(0, 3).join(', ');
                const extraDetails = allFeatures.filter(f => !detailedFeatures.some(df => df.includes(f))).slice(0, 2).join(lang === 'vi' ? ' và ' : ' and ') || (lang === 'vi' ? 'không khí ấm cúng' : 'cozy ambiance');
                return langData.template(catchy, roomType, featureString, extraDetails);
            };

            // Store descriptions for both languages
            const descriptions = {
                en: generateDesc('en'),
                vi: generateDesc('vi')
            };

            // Display and handle language toggle
            descriptionText.value = descriptions.en;
            const descriptionBox = document.getElementById('descriptionBox');
            if (descriptionBox) {
                descriptionBox.style.display = 'block';
            } else {
                console.error('Description box element not found');
            }

            const languageSelect = document.getElementById('languageSelect');
            if (!languageSelect) {
                console.error('Language select element not found');
                return;
            }

            let currentDescription = descriptions.en;
            languageSelect.onchange = function() {
                const lang = this.value;
                currentDescription = descriptions[lang];
                descriptionText.value = currentDescription;
            };

            // Save edits and setup sharing
            const saveEditButton = document.getElementById('saveEditButton');
            if (saveEditButton) {
                saveEditButton.onclick = function() {
                    currentDescription = descriptionText.value;
                    descriptions[languageSelect.value] = currentDescription;
                    alert('Edits saved!');
                };
            } else {
                console.error('Save edit button not found');
            }

            setupShareButton(() => currentDescription);
        } else {
            throw new Error('No valid response data from Vision API');
        }
    } catch (error) {
        console.error('Error in generateDescription:', error);
        descriptionText.value = 'Oops! Couldn’t analyze the photo. Try again.';
        const descriptionBox = document.getElementById('descriptionBox');
        if (descriptionBox) {
            descriptionBox.style.display = 'block';
        }
    }
}

function setupShareButton(getDescription) {
    const shareButton = document.getElementById('shareButton');
    if (!shareButton) {
        console.error('Share button not found');
        return;
    }
    shareButton.onclick = function() {
        const photoUrl = document.getElementById('photoPreview').src;
        const shareText = getDescription();

        // Corrected Facebook share URL
        const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(fbShareUrl, '_blank', 'width=600,height=400,scrollbars=yes');
    };
}
