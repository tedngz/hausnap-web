document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);

// Replace with your Google Cloud Vision API key (see setup below)
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
    // Prepare the image data for the API (base64 without the prefix)
    const base64Image = imageData.split(',')[1];

    // Request payload for Google Cloud Vision API
    const requestBody = {
        requests: [
            {
                image: {
                    content: base64Image
                },
                features: [
                    { type: 'LABEL_DETECTION', maxResults: 10 },
                    { type: 'OBJECT_LOCALIZATION', maxResults: 5 }
                ]
            }
        ]
    };

    try {
        // Send request to Google Vision API
        const response = await fetch(VISION_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (data.responses && data.responses[0]) {
            const labels = data.responses[0].labelAnnotations || [];
            const objects = data.responses[0].localizedObjectAnnotations || [];

            // Generate a description from labels and objects
            const roomFeatures = labels.map(label => label.description.toLowerCase());
            const detectedObjects = objects.map(obj => obj.name.toLowerCase());
            const allFeatures = [...new Set([...roomFeatures, ...detectedObjects])]; // Remove duplicates

            // Simple logic to guess room type and craft description
            let roomType = 'Room';
            if (allFeatures.includes('bed')) roomType = 'Bedroom';
            else if (allFeatures.includes('oven') || allFeatures.includes('sink')) roomType = 'Kitchen';
            else if (allFeatures.includes('sofa') || allFeatures.includes('tv')) roomType = 'Living Room';

            const featureString = allFeatures.slice(0, 3).join(', ') || 'modern decor';
            const description = `Spacious ${roomType} with ${featureString}. Bright and inviting!`;

            // Display the description
            const descriptionText = document.getElementById('descriptionText');
            descriptionText.textContent = description;
            document.getElementById('descriptionBox').style.display = 'block';

            setupShareButton(description);
        } else {
            throw new Error('No analysis returned from API');
        }
    } catch (error) {
        console.error('Error with Vision API:', error);
        const descriptionText = document.getElementById('descriptionText');
        descriptionText.textContent = 'Oops! Couldn’t analyze the photo. Try again.';
        document.getElementById('descriptionBox').style.display = 'block';
    }
}

function setupShareButton(description) {
    const shareButton = document.getElementById('shareButton');
    shareButton.onclick = function() {
        const photoUrl = document.getElementById('photoPreview').src;
        const shareText = `${description} Check out this room!`;
        
        const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(photoUrl)}&quote=${encodeURIComponent(shareText)}`;
        window.open(fbShareUrl, '_blank', 'width=600,height=400');
    };
}
