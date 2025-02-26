// Google Vision API key
const VISION_API_KEY = 'AIzaSyBLhYy2wvSIqtOn3VOh98CTJHN6mp48MMI';
const VISION_API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;

// Google Client ID
const CLIENT_ID = '1076710080620-e5cbtvmb1u7r93j64s17qif3hv767ac4.apps.googleusercontent.com';

const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const themeIcon = themeToggle.querySelector('.icon');
themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    themeIcon.textContent = isDarkMode ? '🌙' : '☀️';
});

let userToken = null;

window.addEventListener('load', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        body.classList.add('dark-mode');
        themeIcon.textContent = '🌙';
    } else {
        themeIcon.textContent = '☀️';
    }

    if (navigator.geolocation) {
        console.log('Requesting location permission on page load...');
        navigator.geolocation.getCurrentPosition(
            (position) => console.log('Initial location permission granted:', position.coords),
            (error) => console.warn('Initial location permission denied or failed:', error.message),
            { timeout: 10000 }
        );
    }

    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: handleCredentialResponse
    });
    google.accounts.id.renderButton(
        document.getElementById('googleSignIn'),
        { theme: 'outline', size: 'medium', text: 'signin_with' }
    );

    const savedToken = localStorage.getItem('googleToken');
    if (savedToken) {
        userToken = savedToken;
        updateAuthUI(true);
    } else {
        updateAuthUI(false);
    }
});

function handleCredentialResponse(response) {
    if (response.credential) {
        userToken = response.credential;
        localStorage.setItem('googleToken', userToken);
        const profile = parseJwt(userToken);
        console.log('User signed in:', profile);
        updateAuthUI(true);
    } else {
        console.error('Sign-in failed:', response);
        displayError('Sign-in failed. Check console for details.');
    }
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function updateAuthUI(isSignedIn) {
    const googleSignIn = document.getElementById('googleSignIn');
    const userProfile = document.getElementById('userProfile');
    const userIcon = document.getElementById('userIcon');
    const signOut = document.getElementById('signOut');
    const photoInput = document.getElementById('photoInput');
    const uploadPrompt = document.querySelector('.prompt');

    if (isSignedIn) {
        googleSignIn.style.display = 'none';
        userProfile.style.display = 'flex';
        const profile = parseJwt(userToken);
        userIcon.src = profile.picture;
        userIcon.title = `${profile.name} (${profile.email})`;
        photoInput.disabled = false;
        uploadPrompt.textContent = 'Upload photos of your apartment to get an instant description!';
    } else {
        googleSignIn.style.display = 'inline-block';
        userProfile.style.display = 'none';
        userIcon.src = '';
        photoInput.disabled = true;
        uploadPrompt.textContent = 'Please sign in to upload photos and generate descriptions.';
    }
}

document.getElementById('signOut').addEventListener('click', () => {
    userToken = null;
    localStorage.removeItem('googleToken');
    google.accounts.id.disableAutoSelect();
    console.log('User signed out');
    updateAuthUI(false);
});

function handlePhotoUpload(event) {
    if (!userToken) {
        console.log('User not signed in, upload blocked');
        displayError('Please sign in to upload photos.');
        return;
    }

    console.log('Photo upload triggered');
    const files = event.target.files;
    if (!files || files.length === 0) {
        console.log('No files selected');
        return;
    }
    console.log(`Number of files selected: ${files.length}`);

    const previewContainer = document.getElementById('previewContainer');
    if (!previewContainer) {
        console.error('Preview container not found');
        return;
    }
    previewContainer.innerHTML = '';

    const imageDataPromises = Array.from(files).map(file => {
        return new Promise((resolve) => {
            console.log(`Reading file: ${file.name}`);
            const reader = new FileReader();
            reader.onload = function(e) {
                console.log(`File ${file.name} read successfully`);
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = 'Preview';
                previewContainer.appendChild(img);
                resolve(e.target.result);
            };
            reader.onerror = function(e) {
                console.error(`Error reading file ${file.name}:`, e);
            };
            reader.readAsDataURL(file);
        });
    });

    Promise.all(imageDataPromises).then(imageDataArray => {
        console.log('All files read successfully:', imageDataArray.length, 'images');
        generateDescription(imageDataArray);
    }).catch(error => {
        console.error('Error reading files:', error);
        displayError('Error: Couldn’t process uploaded images. Check console.');
    });
}

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
                console.log('GPS coordinates retrieved:', { latitude, longitude });
                const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
                resolve(mapsLink);
            },
            (error) => {
                console.warn('Geolocation error:', error.message);
                resolve('Location unavailable');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });
}

function displayError(message) {
    const descriptionText = document.getElementById('descriptionText');
    const descriptionBox = document.getElementById('descriptionBox');
    if (descriptionText && descriptionBox) {
        descriptionText.value = message;
        descriptionBox.style.display = 'block';
    } else {
        console.error('Cannot display error - UI elements missing');
    }
}

async function generateDescription(imageDataArray) {
    const descriptionText = document.getElementById('descriptionText');
    const descriptionBox = document.getElementById('descriptionBox');
    if (!descriptionText || !descriptionBox) {
        console.error('Required DOM elements missing:', { descriptionText, descriptionBox });
        return;
    }

    try {
        console.log('User is signed in, generating description...');
        const location = await getLocation();
        console.log('Location retrieved:', location);

        const visionPromises = imageDataArray.map(async (imageData, index) => {
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

            console.log(`Sending request to Vision API for image ${index + 1}...`);
            const response = await fetch(VISION_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request for image ${index + 1} failed with status ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log(`Vision API response for image ${index + 1}:`, JSON.stringify(data, null, 2));
            return data;
        });

        const visionResults = await Promise.all(visionPromises);
        console.log('All Vision API responses:', visionResults);

        let allFeatures = [];
        let allObjects = [];
        visionResults.forEach((data, index) => {
            if (data.responses && data.responses[0]) {
                const labels = (data.responses[0].labelAnnotations || []).map(label => label.description.toLowerCase());
                const objects = (data.responses[0].localizedObjectAnnotations || []).map(obj => obj.name.toLowerCase());
                allFeatures.push(...labels, ...objects);
                allObjects.push(...objects);
                console.log(`Image ${index + 1} - Detected features:`, [...labels, ...objects]);
                console.log(`Image ${index + 1} - Detected objects:`, objects);
            }
        });

        allFeatures = [...new Set(allFeatures)];
        allObjects = [...new Set(allObjects)];
        if (allFeatures.length === 0) {
            console.log('No features detected across images, using fallback');
            allFeatures = ['modern decor', 'bright lighting'];
            allObjects = ['generic decor'];
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
                    `Welcome to this stunning ${roomType}, a beautifully crafted space that blends style and comfort seamlessly. ` +
                    `With ${features}, this room offers a versatile environment perfect for relaxation, work, or entertaining guests. ` +
                    `Multiple perspectives reveal a well-appointed area showcasing ${objects.length} unique elements.\n\n` +
                    `Furniture:\n- ${objects.join('\n- ')}\n\n` +
                    `Property Details:\n` +
                    `- Price: $400/month (negotiable)\n` +
                    `- Room Size: Approximately 30 m²\n` +
                    `- Amenities: High-speed Wi-Fi, air conditioning, cleaning service, nearby parking\n` +
                    `- Location: ${loc}`
            },
            vi: {
                catchyPhrases: ["Trải nghiệm không gian sống lý tưởng!"],
                roomTypes: { room: 'phòng', bedroom: 'phòng ngủ', kitchen: 'nhà bếp', livingRoom: 'phòng khách' },
                featureMap: {
                    bed: ['giường king-size sang trọng', 'tủ quần áo rộng', 'đèn chiếu sáng dịu'],
                    kitchen: ['thiết bị hiện đại', 'mặt bàn thanh lịch', 'tủ đựng đồ rộng'],
                    livingRoom: ['ghế sofa dài êm ái', 'cửa sổ lớn', 'trung tâm giải trí hiện đại'],
                    default: ['trang trí tinh tế', 'bố cục linh hoạt', 'không khí sáng sủa']
                },
                template: (catchy, roomType, features, objects, loc) =>
                    `${catchy}\n\n` +
                    `Chào mừng đến với ${roomType} tuyệt đẹp này, một không gian được chế tác tinh tế kết hợp hoàn hảo giữa phong cách và sự thoải mái. ` +
                    `Với ${features}, căn phòng này mang đến một môi trường linh hoạt, lý tưởng để thư giãn, làm việc hoặc tiếp đãi khách. ` +
                    `Nhiều góc nhìn cho thấy một khu vực được trang bị tốt với ${objects.length} yếu tố độc đáo.\n\n` +
                    `Nội thất bao gồm:\n- ${objects.join('\n- ')}\n\n` +
                    `Chi tiết bất động sản:\n` +
                    `- Giá: 10 triệu/tháng (có thể thương lượng)\n` +
                    `- Diện tích phòng: Khoảng 30 m²\n` +
                    `- Tiện ích: Wi-Fi tốc độ cao, điều hòa, dịch vụ vệ sinh, bãi đỗ xe gần đó\n` +
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
                ? allObjects.map(obj => objectTranslations[obj] || obj)
                : allObjects;
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

        const copyButton = document.getElementById('copyButton');
        if (copyButton) {
            copyButton.onclick = async function() {
                try {
                    await navigator.clipboard.writeText(descriptionText.value);
                    console.log('Description copied to clipboard:', descriptionText.value);
                    alert('Description copied to clipboard! Paste it into your Facebook post.');
                } catch (error) {
                    console.error('Failed to copy description:', error);
                    displayError('Failed to copy description. Check console for details.');
                }
            };
        }

        setupShareButton(() => currentDescription);
    } catch (error) {
        console.error('Error generating description:', error);
        displayError('Error: Couldn’t generate description. Check console for details.');
    }
}

function setupShareButton(getDescription) {
    const shareButton = document.getElementById('shareButton');
    if (!shareButton) {
        console.error('Share button not found');
        return;
    }
    shareButton.onclick = function() {
        // Open mobile Facebook composer directly
        const fbShareUrl = 'https://m.facebook.com/sharer.php';
        console.log('Opening mobile Facebook composer, URL:', fbShareUrl);
        try {
            window.open(fbShareUrl, '_blank');
            console.log('Facebook composer opened successfully');
        } catch (error) {
            console.error('Failed to open Facebook composer:', error);
            displayError('Failed to open Facebook composer. Check console for details.');
        }
    };
}

document.getElementById('photoInput').addEventListener('change', handlePhotoUpload);
