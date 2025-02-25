document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);

// Replace with your Google Cloud Vision API key
const API_KEY = 'AIzaSyBLhYy2wvSIqtOn3VOh98CTJHN6mp48MMI';
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`;

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
            const allFeatures = [...new Set([...labels, ...objects])]; // Combine and dedupe

            // Determine room type and features
            let roomType = 'room';
            let detailedFeatures = [];
            const catchyPhrases = [
                "Live the dream in this stunning space!",
                "Your perfect retreat awaits!",
                "Step into luxury with this gem!"
            ];
            const randomCatchy = catchyPhrases[Math.floor(Math.random() * catchyPhrases.length)];

            if (allFeatures.includes('bed')) {
                roomType = 'bedroom';
                detailedFeatures = [
                    'luxurious king-sized bed',
                    'spacious walk-in closet',
                    'soft recessed lighting',
                    'plush carpeting'
                ].filter(f => allFeatures.some(af => f.includes(af)) || Math.random() > 0.3); // Smart guess
            } else if (allFeatures.includes('oven') || allFeatures.includes('sink')) {
                roomType = 'kitchen';
                detailedFeatures = [
                    'state-of-the-art stainless steel appliances',
                    'elegant granite countertops',
                    'deep farmhouse sink',
                    'ample cabinet storage'
                ].filter(f => allFeatures.some(af => f.includes(af)) || Math.random() > 0.3);
            } else if (allFeatures.includes('sofa') || allFeatures.includes('television')) {
                roomType = 'living room';
                detailedFeatures = [
                    'plush sectional sofa',
                    'expansive floor-to-ceiling windows',
                    'sleek hardwood flooring',
                    'modern entertainment center'
                ].filter(f => allFeatures.some(af => f.includes(af)) || Math.random() > 0.3);
            } else {
                detailedFeatures = [
                    'tasteful contemporary decor',
                    'bright natural light',
                    'versatile open layout',
                    'chic wall accents'
                ];
            }

            const featureString = detailedFeatures.slice(0, 3).join(', ');
            const extraDetails = allFeatures.filter(f => !detailedFeatures.some(df => df.includes(f))).slice(0, 2).join(' and ') || 'cozy ambiance';

            // Detailed description
            const description = `${randomCatchy}\n\n` +
                `Welcome to this breathtaking ${roomType}, where elegance meets comfort. Featuring ${featureString}, ` +
                `this space offers a perfect blend of style and functionality. Enjoy ${extraDetails} that elevate the experience. ` +
                `Ideal for unwinding after a long day or hosting unforgettable gatherings.\n\n` +
                `Listing Details:\n` +
                `- Price: $1,200/month (adjust as needed)\n` +
                `- Space: Approximately 400 sq ft\n` +
                `- Amenities: High-speed Wi-Fi, central heating/cooling, nearby parking`;

            // Display editable description
            const descriptionText = document.getElementById('descriptionText');
            descriptionText.value = description;
            document.getElementById('descriptionBox').style.display = 'block';

            // Save edits and setup sharing
            let currentDescription = description;
            document.getElementById('saveEditButton').onclick = function() {
                currentDescription = descriptionText.value;
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
        const shareText = `${getDescription()} Check out this room!`;
        
        const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}"e=${encodeURIComponent(shareText)}`;
        window.open(fbShareUrl, '_blank', 'width=600,height=400');
    };
}
