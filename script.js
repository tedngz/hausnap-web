document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);

// Google Vision API key
const VISION_API_KEY = 'AIzaSyBLhYy2wvSIqtOn3VOh98CTJHN6mp48MMI'; // Replace with your actual key
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

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
        console.log('Sending request to Vision API with body:', requestBody);
        const response = await fetch(VISION_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Raw API response:', data);

        let allFeatures = [];
        if (data.responses && data.responses[0]) {
            const labels = (data.responses[0].labelAnnotations || []).map(label => label.description.toLowerCase());
            const objects = (data.responses[0].localizedObjectAnnotations || []).map(obj => obj.name.toLowerCase());
            allFeatures = [...new Set([...labels, ...objects])];
            console.log('Detected features:', allFeatures);
        } else {
            console.warn('No valid response data from Vision API');
        }

        // Simple fallback description if no features detected
        if (allFeatures.length === 0) {
            console.log('No features detected, using fallback description');
            allFeatures = ['modern decor', 'bright lighting'];
        }

        // Language-specific content (hardcoded)
        const languages = {
            en: {
                catchyPhrases: ["Live the dream in this stunning space!"],
                roomTypes: { room: 'room', bedroom: 'bedroom', kitchen: 'kitchen', livingRoom: 'living room' },
                featureMap: {
                    bed: ['luxurious king-sized bed', 'spacious walk-in closet'],
                    kitchen: ['state-of-the-art appliances', 'elegant countertops'],
                    livingRoom: ['plush sectional sofa', 'large windows'],
                    default: ['tasteful decor', 'versatile layout']
                },
                template: (catchy, roomType, features) => `${catchy}\n\nWelcome to this ${roomType} with ${features}.`
            },
            vi: {
                catchyPhrases: ["Sống trong giấc mơ với không gian này!"],
                roomTypes: { room: 'phòng', bedroom: 'phòng ngủ', kitchen: 'nhà bếp', livingRoom: 'phòng khách' },
                featureMap: {
                    bed: ['giường king-size sang trọng', 'tủ quần áo rộng'],
                    kitchen: ['thiết bị hiện đại', 'mặt bàn thanh lịch'],
                    livingRoom: ['ghế sofa dài êm ái', 'cửa sổ lớn'],
                    default: ['trang trí tinh tế', 'bố cục linh hoạt']
                },
                template: (catchy, roomType, features) => `${catchy}\n\nChào mừng đến với ${roomType} với ${features}.`
            }
        };

        // Determine room type
        let roomKey = 'room';
        if (allFeatures.includes('bed')) roomKey = 'bed';
        else if (allFeatures.includes('oven') || allFeatures.includes('sink')) roomKey = 'kitchen';
        else if (allFeatures.includes('sofa') || allFeatures.includes('television')) roomKey = 'livingRoom';

        const generateDesc = (lang) => {
            const langData = languages[lang];
            const catchy = langData.catchyPhrases[0];
            const roomType = langData.roomTypes[roomKey === 'room' ? 'room' : roomKey];
            const featureOptions = langData.featureMap[roomKey] || langData.featureMap.default;
            const featureString = featureOptions.slice(0, 2).join(', ');
            return langData.template(catchy, roomType, featureString);
        };

        // Store descriptions
        const descriptions = {
            en: generateDesc('en'),
            vi: generateDesc('vi')
        };

        console.log('Generated descriptions:', descriptions);

        // Update UI
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
        const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(fbShareUrl, '_blank', 'width=600,height=400,scrollbars=yes');
        console.log('Share button clicked, URL:', fbShareUrl);
    };
}
