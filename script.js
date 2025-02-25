document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);

// Google Vision API key
const VISION_API_KEY = 'AIzaSyBLhYy2wvSIqtOn3VOh98CTJHN6mp48MMI';
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

// Theme toggle setup
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const themeIcon = themeToggle.querySelector('.icon');
themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    themeIcon.textContent = isDarkMode ? '🌙' : '☀️';
});

// Load saved theme or system preference
window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        body.classList.add('dark-mode');
        themeIcon.textContent = '🌙';
    } else {
        themeIcon.textContent = '☀️';
    }
});

function handlePhotoUpload(event) {
    console.log('Photo upload triggered');
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('File read successfully');
        const preview = document.getElementById('photoPreview');
        if (!preview) {
            console.error('Photo preview element not found');
            return;
        }
        preview.src = e.target.result;
        preview.style.display = 'block';
        generateDescription(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Object translation mapping (English to Vietnamese)
const objectTranslations = {
    'bed': 'giường',
    'washing machine': 'máy giặt',
    'desk': 'bàn làm việc',
    'sofa': 'ghế sofa',
    'television': 'tivi',
    'table': 'bàn',
    'chair': 'ghế',
    'lamp': 'đèn',
    'window': 'cửa sổ',
    'sink': 'bồn rửa',
    'oven': 'lò nướng',
    'refrigerator': 'tủ lạnh',
    'closet': 'tủ quần áo',
    'mirror': 'gương',
    'door': 'cửa',
    'rug': 'thảm',
    'curtain': 'rèm cửa'
};

// Function to get device GPS location and format as a raw Google Maps URL
function getLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported by this browser');
            resolve('Location unavailable');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log('GPS coordinates:', { latitude, longitude });
                const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
                resolve(mapsLink); // Return raw URL
            },
            (error) => {
                console.warn('Geolocation error:', error.message);
                resolve('Location unavailable');
            }
        );
    });
}

async function generateDescription(imageData) {
    const descriptionText = document.getElementById('descriptionText');
    const descriptionBox = document.getElementById('descriptionBox');
    if (!descriptionText || !descriptionBox) {
        console.error('Required DOM elements missing:', { descriptionText, descriptionBox });
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
        // Get location first
        const location = await getLocation();
        console.log('Location retrieved:', location);

        console.log('Sending request to Vision API...');
        const response = await fetch(VISION_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('Raw API response:', JSON.stringify(data, null, 2));

        let allFeatures = [];
        let objectList = [];
        if (data.responses && data.responses[0]) {
            const labels = (data.responses[0].labelAnnotations || []).map(label => label.description.toLowerCase());
            const objects = (data.responses[0].localizedObjectAnnotations || []).map(obj => obj.name.toLowerCase());
            allFeatures = [...new Set([...labels, ...objects])];
            objectList = objects.length > 0 ? objects : ['no specific objects detected'];
            console.log('Detected features:', allFeatures);
            console.log('Detected objects (English):', objectList);
        } else {
            console.warn('No valid response data from Vision API');
            allFeatures = ['modern decor', 'bright lighting'];
            objectList = ['generic decor'];
        }

        const languages = {
            en: {
                catchyPhrases: ["Live the dream in this stunning space!"],
                roomTypes: { room: 'room', bedroom: 'bedroom', kitchen: 'kitchen', livingRoom: 'living room' },
                featureMap: {
                    bed: ['luxurious king-sized bed', 'spacious walk-in closet', 'soft recessed lighting'],
                    kitchen: ['state-of-the-art appliances', 'elegant countertops', 'ample storage'],
                    livingRoom: ['plush sectional sofa', 'large windows', 'modern entertainment center'],
                    default: ['tasteful decor', 'versatile layout', 'bright ambiance']
                },
                template: (catchy, roomType, features, objects, loc) =>
                    `${catchy}\n\n` +
                    `Welcome to this stunning ${roomType}, a perfect blend of style and comfort. Featuring ${features}, ` +
                    `this space is designed for both relaxation and functionality.\n\n` +
                    `Furniture:\n- ${objects.join('\n- ')}\n\n` +
                    `Property Details:\n` +
                    `- Price: $400/month (negotiable)\n` +
                    `- Room Size: Approximately 30 m²\n` +
                    `- Amenities: High-speed Wi-Fi, central heating/cooling, nearby parking\n` +
                    `- Location: ${loc}`
            },
            vi: {
                catchyPhrases: ["Sống trong giấc mơ với không gian này!"],
                roomTypes: { room: 'phòng', bedroom: 'phòng ngủ', kitchen: 'nhà bếp', livingRoom: 'phòng khách' },
                featureMap: {
                    bed: ['giường king-size sang trọng', 'tủ quần áo rộng', 'đèn chiếu sáng dịu'],
                    kitchen: ['thiết bị hiện đại', 'mặt bàn thanh lịch', 'tủ đựng đồ rộng'],
                    livingRoom: ['ghế sofa dài êm ái', 'cửa sổ lớn', 'trung tâm giải trí hiện đại'],
                    default: ['trang trí tinh tế', 'bố cục linh hoạt', 'không khí sáng sủa']
                },
                template: (catchy, roomType, features, objects, loc) =>
                    `${catchy}\n\n` +
                    `Chào mừng đến với ${roomType} tuyệt đẹp này, sự kết hợp hoàn hảo giữa phong cách và sự thoải mái. Nổi bật với ${features}, ` +
                    `không gian này được thiết kế cho cả sự thư giãn và tiện nghi.\n\n` +
                    `Nội thất bao gồm:\n- ${objects.join('\n- ')}\n\n` +
                    `Chi tiết bất động sản:\n` +
                    `- Giá: $400/tháng (có thể thương lượng)\n` +
                    `- Diện tích phòng: Khoảng 30 m²\n` +
                    `- Tiện ích: Wi-Fi tốc độ cao, điều hòa/lò sưởi trung tâm, bãi đỗ xe gần đó\n` +
                    `- Vị trí: ${loc === 'Location unavailable' ? 'Vị trí không khả dụng' : loc}`
            }
        };

        let roomKey = 'room';
        if (allFeatures.includes('bed')) roomKey = 'bed';
        else if (allFeatures.includes('oven') || allFeatures.includes('sink')) roomKey = 'kitchen';
        else if (allFeatures.includes('sofa') || allFeatures.includes('television')) roomKey = 'livingRoom';

        const generateDesc = (lang) => {
            const langData = languages[lang];
            const catchy = langData.catchyPhrases[0];
            const roomType = langData.roomTypes[roomKey === 'room' ? 'room' : roomKey];
            const featureOptions = langData.featureMap[roomKey] || langData.featureMap.default;
            const featureString = featureOptions.slice(0, 3).join(', ');
            const translatedObjects = lang === 'vi'
                ? objectList.map(obj => objectTranslations[obj] || obj)
                : objectList;
            console.log(`Translated objects for ${lang}:`, translatedObjects);
            return langData.template(catchy, roomType, featureString, translatedObjects, location);
        };

        const descriptions = {
            en: generateDesc('en'),
            vi: generateDesc('vi')
        };

        console.log('Generated descriptions:', descriptions);

        descriptionText.value = descriptions.en;
        descriptionBox.style.display = 'block';
        console.log('Description set and box displayed');

        const languageSelect = document.getElementById('languageSelect');
        if (!languageSelect) {
            console.error('Language select not found');
            return;
        }

        let currentDescription = descriptions.en;
        languageSelect.onchange = function() {
            const lang = this.value;
            currentDescription = descriptions[lang];
            descriptionText.value = currentDescription;
            console.log('Language switched to:', lang);
        };

        const saveEditButton = document.getElementById('saveEditButton');
        if (saveEditButton) {
            saveEditButton.onclick = function() {
                currentDescription = descriptionText.value;
                descriptions[languageSelect.value] = currentDescription;
                alert('Edits saved!');
                console.log('Edits saved:', currentDescription);
            };
        }

        setupShareButton(() => currentDescription);
    } catch (error) {
        console.error('Error generating description:', error);
        descriptionText.value = 'Error: Couldn’t generate description. Check console for details.';
        descriptionBox.style.display = 'block';
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
        const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}"e=${encodeURIComponent(shareText)}`;
        window.open(fbShareUrl, '_blank', 'width=600,height=400,scrollbars=yes');
        console.log('Share button clicked, URL:', fbShareUrl);
    };
}
