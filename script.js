document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);

// Google Vision and Translate API keys
const VISION_API_KEY = 'YOUR_GOOGLE_VISION_API_KEY_HERE';
const TRANSLATE_API_KEY = 'YOUR_GOOGLE_TRANSLATE_API_KEY_HERE';
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
const TRANSLATE_API_URL = `https://translation.googleapis.com/language/translate/v2?key=${TRANSLATE_API_KEY}`;

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('photoPreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            generateDescription(file, e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

async function translateText(text, targetLang) {
    try {
        const response = await fetch(TRANSLATE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                target: targetLang,
                format: 'text'
            })
        });
        const data = await response.json();
        if (data.data && data.data.translations) {
            return data.data.translations[0].translatedText;
        }
        throw new Error('Translation failed');
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

async function generateDescription(file, imageData) {
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
        const response = await fetch(VISION_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (data.responses && data.responses[0]) {
            const labels = (data.responses[0].labelAnnotations || []).map(label => label.description.toLowerCase());
            const objects = (data.responses[0].localizedObjectAnnotations || []).map(obj => obj.name.toLowerCase());
            const allFeatures = [...new Set([...labels, ...objects])];

            let roomKey = 'room';
            if (allFeatures.includes('bed')) roomKey = 'bed';
            else if (allFeatures.includes('oven') || allFeatures.includes('sink')) roomKey = 'kitchen';
            else if (allFeatures.includes('sofa') || allFeatures.includes('television')) roomKey = 'livingRoom';

            const catchyPhrases = [
                "Live the dream in this stunning space!",
                "Your perfect retreat awaits!",
                "Step into luxury with this gem!"
            ];
            const catchy = catchyPhrases[Math.floor(Math.random() * catchyPhrases.length)];
            const roomTypes = { room: 'room', bed: 'bedroom', kitchen: 'kitchen', livingRoom: 'living room' };
            const featureMap = {
                bed: ['luxurious king-sized bed', 'spacious walk-in closet', 'soft recessed lighting', 'plush carpeting'],
                kitchen: ['state-of-the-art stainless steel appliances', 'elegant granite countertops', 'deep farmhouse sink', 'ample cabinet storage'],
                livingRoom: ['plush sectional sofa', 'expansive floor-to-ceiling windows', 'sleek hardwood flooring', 'modern entertainment center'],
                default: ['tasteful contemporary decor', 'bright natural light', 'versatile open layout', 'chic wall accents']
            };

            const roomType = roomTypes[roomKey];
            const featureOptions = featureMap[roomKey] || featureMap.default;
            const detailedFeatures = featureOptions.filter(f => allFeatures.some(af => f.includes(af)) || Math.random() > 0.3);
            const featureString = detailedFeatures.slice(0, 3).join(', ');
            const extraDetails = allFeatures.filter(f => !detailedFeatures.some(df => df.includes(f))).slice(0, 2).join(' and ') || 'cozy ambiance';

            const englishDesc = `${catchy}\n\n` +
                `Welcome to this breathtaking ${roomType}, where elegance meets comfort. Featuring ${featureString}, ` +
                `this space offers a perfect blend of style and functionality. Enjoy ${extraDetails} that elevate the experience. ` +
                `Ideal for unwinding after a long day or hosting unforgettable gatherings.\n\n` +
                `Listing Details:\n` +
                `- Price: $1,200/month (adjust as needed)\n` +
                `- Space: Approximately 400 sq ft\n` +
                `- Amenities: High-speed Wi-Fi, central heating/cooling, nearby parking`;

            const descriptions = { en: englishDesc };
            descriptions.vi = await translateText(englishDesc, 'vi');

            const descriptionText = document.getElementById('descriptionText');
            const languageSelect = document.getElementById('languageSelect');
            descriptionText.value = descriptions.en;
            document.getElementById('descriptionBox').style.display = 'block';

            let currentDescription = descriptions.en;
            languageSelect.onchange = async function() {
                const lang = this.value;
                if (!descriptions[lang]) {
                    descriptions[lang] = await translateText(descriptions.en, lang);
                }
                currentDescription = descriptions[lang];
                descriptionText.value = currentDescription;
            };

            document.getElementById('saveEditButton').onclick = function() {
                currentDescription = descriptionText.value;
                descriptions[languageSelect.value] = currentDescription;
                alert('Edits saved!');
            };
            setupShareButton(() => currentDescription);
        } else {
            throw new Error('No analysis returned from API');
        }
    } catch (error) {
        console.error('Error with Vision API:', error);
        const descriptionText = document.getElementById('descriptionText');
        descriptionText.value = 'Oops! Couldn’t analyze the photo. Try again.';
        document.getElementById('descriptionBox').style.display = 'block';
    }
}

function setupShareButton(getDescription) {
    const shareButton = document.getElementById('shareButton');
    shareButton.onclick = function() {
        const photoUrl = document.getElementById('photoPreview').src;
        const shareText = getDescription();

        // Fixed Facebook share URL with proper parameters
        const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(fbShareUrl, '_blank', 'width=600,height=400,scrollbars=yes');
    };
}
