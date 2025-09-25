// Variables globales
let passwordRequiredSecret = null;

// Générateur cryptographiquement sécurisé
function getSecureRandomInt(max) {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] % max;
    } else {
        // Fallback avec Math.random() si crypto n'est pas disponible
        console.warn('⚠️ API Crypto non disponible, utilisation du fallback Math.random()');
        return Math.floor(Math.random() * max);
    }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    setupTabNavigation();
    setupPasswordGenerator();
    setupSecretSharing();
    setupSecretRetrieval();
    setupEventListeners();
    
    // Générer un mot de passe par défaut
    generatePasswords();
    
    // Vérifier si un secret est passé dans l'URL
    checkForSecretInURL();
}

// ===== NAVIGATION DES ONGLETS =====
function setupTabNavigation() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchToTab(tabName);
        });
    });
}

function switchToTab(tabName) {
    // Désactiver tous les onglets et contenus
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Activer l'onglet et le contenu sélectionné
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// ===== GÉNÉRATEUR DE MOTS DE PASSE =====
function setupPasswordGenerator() {
    const slider = document.getElementById('length');
    const lengthValue = document.getElementById('lengthValue');
    const generateBtn = document.getElementById('generateBtn');
    const copyAllBtn = document.getElementById('copyAllBtn');
    
    // Mise à jour de la valeur du slider
    slider.addEventListener('input', function() {
        lengthValue.textContent = this.value;
    });
    
    // Gestion des checkbox actives
    document.querySelectorAll('.checkbox-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        
        item.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                checkbox.checked = !checkbox.checked;
            }
            item.classList.toggle('active', checkbox.checked);
        });
    });
    
    // Génération de mots de passe
    generateBtn.addEventListener('click', generatePasswords);
    
    // Copier tous les mots de passe
    copyAllBtn.addEventListener('click', function() {
        const passwords = Array.from(document.querySelectorAll('#passwordList .password-text'))
            .map(el => el.textContent).join('\n');
        
        copyToClipboard(passwords, this);
    });
}

function generatePasswords() {
    console.log('=== DÉBUT GÉNÉRATION SÉCURISÉE ===');
    
    // Capturer les éléments et leurs valeurs de manière défensive
    const lengthElement = document.getElementById('length');
    const countElement = document.getElementById('count');
    
    if (!lengthElement || !countElement) {
        console.error('Éléments de configuration non trouvés');
        showError('Erreur de configuration de la page', 'generator');
        return;
    }
    
    // Conversion avec validation rigoureuse
    let length = parseInt(lengthElement.value, 10);
    let count = parseInt(countElement.value, 10);
    
    // Fallback si les valeurs sont corrompues
    if (isNaN(length)) {
        console.warn('Valeur de longueur corrompue, utilisation de 16 par défaut');
        length = 16;
    }
    if (isNaN(count)) {
        console.warn('Valeur de count corrompue, utilisation de 1 par défaut');
        count = 1;
    }
    
    // Contraintes strictes
    length = Math.max(4, Math.min(128, length));
    count = Math.max(1, Math.min(10, count));
    
    console.log(`Paramètres finaux: longueur=${length}, nombre=${count}`);
    
    // Construction du charset
    let charset = '';
    if (document.getElementById('uppercase')?.checked) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (document.getElementById('lowercase')?.checked) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (document.getElementById('numbers')?.checked) charset += '0123456789';
    // MAJ echevillard 25092025 ; ajout de tous les symboles communs (28 caractères)
    if (document.getElementById('symbols')?.checked) charset += '-!"#$%&()*,./:;?@[]^_{|}+<=>';

    if (charset.length === 0) {
        console.warn('Aucun charset sélectionné, utilisation par défaut');
        charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    }

    console.log(`Charset: ${charset.length} caractères`);
    
    const passwords = [];
    const options = {
        uppercase: document.getElementById('uppercase')?.checked,
        lowercase: document.getElementById('lowercase')?.checked,
        numbers: document.getElementById('numbers')?.checked,
        symbols: document.getElementById('symbols')?.checked
    };
    
    // Génération avec méthode sécurisée et contrôle strict
    for (let i = 0; i < count; i++) {
        const password = generateSecurePasswordArray(charset, length);
        
        if (password.length !== length) {
            console.error(`ERREUR CRITIQUE : Mot de passe ${i+1} longueur ${password.length} != ${length}`);
            console.error('Password:', password);
            console.error('Charset length:', charset.length);
            
            // Tentative de correction manuelle
            const corrected = correctPasswordLength(password, charset, length);
            if (corrected.length === length) {
                console.log('Correction réussie');
                passwords.push(corrected);
            } else {
                showError(`Erreur de génération du mot de passe ${i+1}. Longueur: ${password.length} au lieu de ${length}`, 'generator');
                return;
            }
        } else {

            // MAJ echevillard 25092025 ; vérification de la présence de chaque type de caractère si sélectionné
            let valid = true;
            if (options.uppercase && !/[A-Z]/.test(password)) valid = false;
            if (options.lowercase && !/[a-z]/.test(password)) valid = false;
            if (options.numbers && !/[0-9]/.test(password)) valid = false;
            if (options.symbols && !/[\-\!\"\#\$\%\&\(\)\*\,\.\/\:\;\?\@\[\]\^\_\{\|\}\+\<\=\>]/.test(password)) valid = false;
            if (!valid) {
                console.warn(`Le mot de passe ${i+1} ne contient pas tous les types de caractères requis, régénération`);
                // Réessayer
                i--;
                continue;
            }

            passwords.push(password);
            console.log(`Mot de passe ${i+1}: OK (${password.length} caracteres)`);
        }
    }
    
    // Validation finale
    const invalidPasswords = passwords.filter(p => p.length !== length);
    if (invalidPasswords.length > 0) {
        console.error('VALIDATION FINALE ÉCHOUÉE');
        console.error('Mots de passe invalides:', invalidPasswords.map(p => `[${p.length}]`));
        showError('Erreur de validation finale. Rechargez la page et réessayez.', 'generator');
        return;
    }
    
    console.log('=== GÉNÉRATION RÉUSSIE ===');
    displayPasswords(passwords);
    
    if (passwords.length === 1) {
        updatePasswordStrength(passwords[0], options);
    }
    
    hideErrors('generator');
}

// Méthode avec Array et génération cryptographiquement sécurisée
function generateSecurePasswordArray(charset, targetLength) {
    console.log(`Génération sécurisée: ${targetLength} caractères`);
    
    const password = new Array(targetLength);
    const charsetLength = charset.length;
    
    for (let i = 0; i < targetLength; i++) {
        // Utilisation du générateur cryptographiquement sécurisé
        let randomIndex = getSecureRandomInt(charsetLength);
        
        // Vérification de sécurité
        if (randomIndex >= charsetLength || randomIndex < 0) {
            randomIndex = 0;
        }
        
        password[i] = charset[randomIndex];
    }
    
    const result = password.join('');
    console.log(`Résultat sécurisé: longueur=${result.length}, attendu=${targetLength}`);
    
    // Vérification post-génération
    if (result.length !== targetLength) {
        console.error(`ERREUR ARRAY: ${result.length} != ${targetLength}`);
        console.error('Password array:', password);
        console.error('Joined result:', result);
    }
    
    return result;
}

// Fonction de correction d'urgence
function correctPasswordLength(password, charset, targetLength) {
    console.log(`Correction longueur: de ${password.length} vers ${targetLength}`);
    
    if (password.length === targetLength) {
        return password;
    }
    
    if (password.length > targetLength) {
        // Tronquer
        return password.substring(0, targetLength);
    } else {
        // Compléter avec génération sécurisée
        let corrected = password;
        while (corrected.length < targetLength) {
            const randomIndex = getSecureRandomInt(charset.length);
            corrected += charset[randomIndex];
        }
        return corrected.substring(0, targetLength);
    }
}

function displayPasswords(passwords) {
    const passwordList = document.getElementById('passwordList');
    const resultsDiv = document.getElementById('passwordResults');
    const strengthMeter = document.getElementById('strengthMeter');
    
    passwordList.innerHTML = '';
    
    passwords.forEach((password, index) => {
        // Créer l'élément conteneur
        const item = document.createElement('div');
        item.className = 'password-item';
        
        // Créer l'élément texte du mot de passe
        const passwordDiv = document.createElement('div');
        passwordDiv.className = 'password-text';
        // CORRECTION CRITIQUE : Utiliser textContent au lieu d'innerHTML
        passwordDiv.textContent = password; // Sécurisé contre les caractères HTML
        
        // Créer le bouton de copie
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-btn';
        copyButton.innerHTML = '<i class="fas fa-copy"></i> Copier';
        
        // Attacher l'événement avec une closure pour capturer la valeur
        copyButton.onclick = (function(pwd) {
            return function() {
                copyPassword(copyButton, pwd);
            };
        })(password);
        
        // Assembler les éléments
        item.appendChild(passwordDiv);
        item.appendChild(copyButton);
        passwordList.appendChild(item);
    });
    
    resultsDiv.style.display = 'block';
    strengthMeter.style.display = passwords.length === 1 ? 'block' : 'none';
}

// Version de copyPassword corrigée aussi
function copyPassword(button, password) {
    // Vérification de sécurité
    if (!password || typeof password !== 'string') {
        console.error('Mot de passe invalide pour copie:', password);
        return;
    }
    
    console.log(`Copie du mot de passe: "${password}" (${password.length} chars)`);
    
    copyToClipboard(password, button);
}

// Calcul de la taille de l'alphabet selon les options
function getCharsetSize(options) {
    let size = 0;
    if (options.uppercase) size += 26;
    if (options.lowercase) size += 26;
    if (options.numbers) size += 10;
    // MAJ echevillard 25092025 ; nombre de symboles dans le charset symbols
    if (options.symbols) size += 28;
    return size;
}

// Calcul de l'entropie
function calculateEntropy(password, charsetSize) {
    return password.length * Math.log2(charsetSize);
}

// Estimation du temps de cassage
function estimateCrackTime(entropy) {
    const attempts = Math.pow(2, entropy - 1);
    const attemptsPerSecond = 1e9; // 1 milliard de tentatives par seconde
    const seconds = attempts / attemptsPerSecond;
    
    if (seconds < 2) return `1 seconde`;
    if (seconds < 60) return `${seconds.toFixed(0)} secondes`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(0)} minutes`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(0)} heures`;
    if (seconds < 31536000) return `${(seconds / 86400).toFixed(0)} jours`;
    if (seconds < 315360000000) return `${(seconds / 31536000).toFixed(0)} années`;
    return `${(seconds / 31536000000).toExponential(2)} siècles`;
}

// Évaluation de la force du mot de passe basée sur l'entropie
function getPasswordStrength(password, options) {
    const charsetSize = getCharsetSize(options);
    const entropy = calculateEntropy(password, charsetSize);
    
    let strength = {
        entropy: entropy,
        crackTime: estimateCrackTime(entropy)
    };
    
    // MAJ echevillard 25092025 ; évaluation affinée de la force du mot de passe (6 niveaux au lieu de 4)
    if (entropy < 40) {
        strength.level = 'très-faible';
        strength.text = 'Très faible';
        strength.color = '#dc2626';
        strength.percentage = 10;
        strength.class = 'strength-veryweak';
    } else if (entropy < 64) {
        strength.level = 'faible';
        strength.text = 'Faible';
        strength.color = '#ea580c';
        strength.percentage = 30;
        strength.class = 'strength-weak';
    } else if (entropy < 75) {
        strength.level = 'moyenne';
        strength.text = 'Moyenne';
        strength.color = '#f59e0b';
        strength.percentage = 50;
        strength.class = 'strength-medium';
    } else if (entropy < 100) {
        strength.level = 'bonne';
        strength.text = 'Bonne';
        strength.color = '#eab308';
        strength.percentage = 70;
        strength.class = 'strength-good';
    } else if (entropy < 128) {
        strength.level = 'forte';
        strength.text = 'Forte';
        strength.color = '#22c55e';
        strength.percentage = 85;
        strength.class = 'strength-strong';
    } else {
        strength.level = 'très-forte';
        strength.text = 'Très forte';
        strength.color = '#16a34a';
        strength.percentage = 100;
        strength.class = 'strength-verystrong';
    }
    
    return strength;
}

function updatePasswordStrength(password, options) {
    const strength = getPasswordStrength(password, options);
    const strengthBar = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    
    // Mettre à jour le texte avec l'entropie et le temps de cassage
    strengthText.innerHTML = `
        ${strength.text} 
        <small style="font-size: 0.8em; opacity: 0.8;">
            (${strength.entropy.toFixed(1)} bits - ~${strength.crackTime})
        </small>
    `;
    
    // Mettre à jour la barre
    strengthBar.style.backgroundColor = strength.color;
    strengthBar.className = 'strength-fill ' + strength.class;
}

// ===== PARTAGE DE SECRETS =====
function setupSecretSharing() {
    const secretTextarea = document.getElementById('secret');
    const shareBtn = document.getElementById('shareSecretBtn');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const charCount = document.getElementById('charCount');
    
    // Compteur de caractères
    secretTextarea.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = count;
        
        if (count > 450) {
            charCount.style.color = '#ef4444';
        } else if (count > 400) {
            charCount.style.color = '#f59e0b';
        } else {
            charCount.style.color = '#64748b';
        }
    });
    
    shareBtn.addEventListener('click', shareSecret);
    copyLinkBtn.addEventListener('click', function() {
        const text = document.getElementById('secretLink').textContent;
        copyToClipboard(text, this);
    });
}

async function shareSecret() {
    const secret = document.getElementById('secret').value.trim();
    const retention = document.getElementById('retention').value;
    const password = document.getElementById('secretPassword').value.trim();
    const button = document.getElementById('shareSecretBtn');

    if (!secret) {
        showError('Veuillez entrer un secret à partager', 'share');
        return;
    }

    if (secret.length > 500) {
        showError('Le secret ne peut pas dépasser 500 caractères', 'share');
        return;
    }

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';
    button.disabled = true;

    try {
        const requestData = {
            action: 'store',
            secret: secret,
            retention: retention
        };
        
        if (password) {
            requestData.password = password;
        }

        const response = await fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erreur lors de la création du lien');
        }
        
        const shareUrl = `${window.location.origin}/#secret=${result.id}`;
        
        document.getElementById('secretLink').textContent = shareUrl;
        document.getElementById('secretLinkResult').style.display = 'block';
        
        // Mettre à jour le message d'information selon la rétention
        updateRetentionInfo(result.retention_label, result.has_password);
        
        // Reset du formulaire
        document.getElementById('secret').value = '';
        document.getElementById('secretPassword').value = '';
        document.getElementById('charCount').textContent = '0';
        
        hideErrors('share');
        
    } catch (error) {
        showError('Erreur lors de la création du lien de partage: ' + error.message, 'share');
    } finally {
        button.innerHTML = '<i class="fas fa-share-alt"></i> Créer le lien de partage';
        button.disabled = false;
    }
}

function updateRetentionInfo(retentionLabel, hasPassword) {
    const retentionInfo = document.getElementById('retentionInfo');
    const passwordInfo = hasPassword ? ' et est protégé par un mot de passe' : '';
    
    if (retentionLabel === 'Usage unique') {
        retentionInfo.textContent = `Ce lien ne peut être consulté qu'une seule fois. Il sera supprimé au bout de 7 jours si non utilisé${passwordInfo}.`;
    } else {
        retentionInfo.textContent = `Ce lien est valide pendant ${retentionLabel.toLowerCase()}${passwordInfo}.`;
    }
}

// ===== RÉCUPÉRATION DE SECRETS =====
function setupSecretRetrieval() {
    const retrieveBtn = document.getElementById('retrieveSecretBtn');
    const copySecretBtn = document.getElementById('copySecretBtn');
    const secretIdInput = document.getElementById('secretId');
    const retrievedSecretTextarea = document.getElementById('retrievedSecret');
    
    retrieveBtn.addEventListener('click', retrieveSecret);
    
    copySecretBtn.addEventListener('click', function() {
        const text = retrievedSecretTextarea.value;
        copyToClipboard(text, this);
    });
    
    // Auto-resize du textarea récupéré
    retrievedSecretTextarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.max(100, this.scrollHeight) + 'px';
    });
}

async function retrieveSecret() {
    const secretIdInput = document.getElementById('secretId').value.trim();
    const providedPassword = document.getElementById('retrievePassword').value.trim();
    const button = document.getElementById('retrieveSecretBtn');

    if (!secretIdInput) {
        showError('Veuillez entrer un ID ou lien de secret', 'retrieve');
        return;
    }

    // Extraire l'ID du lien complet
    let secretId = secretIdInput;
    if (secretIdInput.includes('#secret=')) {
        secretId = secretIdInput.split('#secret=')[1];
    } else if (secretIdInput.includes('view.php?id=')) {
        try {
            const url = new URL(secretIdInput);
            secretId = url.searchParams.get('id');
        } catch (e) {
            showError('URL invalide', 'retrieve');
            return;
        }
    }

    if (!secretId || !secretId.match(/^[a-f0-9]{32}$/)) {
        showError('Format d\'ID invalide', 'retrieve');
        return;
    }

    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Récupération...';
    button.disabled = true;

    try {
        const requestData = {
            action: 'retrieve',
            id: secretId
        };
        
        // N'envoyer le mot de passe que s'il n'est pas vide
        if (providedPassword) {
            requestData.password = providedPassword;
        }

        const response = await fetch('api.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
            if (result.password_required) {
                showPasswordSection();
                showError('Ce secret est protégé par un mot de passe. Veuillez l\'entrer ci-dessous.', 'retrieve');
                passwordRequiredSecret = secretId;
                // Focus sur le champ mot de passe
                setTimeout(() => {
                    const passwordField = document.getElementById('retrievePassword');
                    if (passwordField) {
                        passwordField.focus();
                    }
                }, 100);
                return;
            }
            throw new Error(result.error || 'Erreur lors de la récupération');
        }
        
        displayRetrievedSecret(result);
        hidePasswordSection();
        hideErrors('retrieve');
        
        // Reset du formulaire
        document.getElementById('secretId').value = '';
        document.getElementById('retrievePassword').value = '';
        passwordRequiredSecret = null;
        
    } catch (error) {
        console.error('Erreur détaillée:', error);
        showError('Erreur lors de la récupération: ' + error.message, 'retrieve');
        
        // Si c'est une erreur de mot de passe, garder le champ visible et le focus
        if (error.message.includes('mot de passe')) {
            showPasswordSection();
            setTimeout(() => {
                const passwordField = document.getElementById('retrievePassword');
                if (passwordField) {
                    passwordField.focus();
                    passwordField.select();
                }
            }, 100);
        }
    } finally {
        button.innerHTML = '<i class="fas fa-unlock-alt"></i> Récupérer le secret';
        button.disabled = false;
    }
}

function displayRetrievedSecret(result) {
    const secretTextarea = document.getElementById('retrievedSecret');
    const secretInfo = document.getElementById('secretInfo');
    const deletionInfo = document.getElementById('deletionInfo');
    const resultsDiv = document.getElementById('retrievedSecretResult');
    
    if (!secretTextarea || !resultsDiv) {
        console.error('Éléments HTML manquants pour afficher le secret');
        return;
    }
    
    secretTextarea.value = result.secret;
    
    // Ajuster la hauteur du textarea
    secretTextarea.style.height = 'auto';
    secretTextarea.style.height = Math.max(100, secretTextarea.scrollHeight) + 'px';
    
    // Afficher les informations du secret si l'élément existe
    if (secretInfo) {
        const accessText = result.access_count > 1 ? `${result.access_count}e accès` : '1er accès';
        const retentionLabel = result.retention_label || 'Inconnu';
        const createdDate = result.created_at ? formatDate(result.created_at) : 'Inconnue';
        secretInfo.textContent = `${accessText} • Type: ${retentionLabel} • Créé: ${createdDate}`;
    }
    
    // Message de suppression selon le type
    if (deletionInfo) {
        if (result.retention_type === 'unique') {
            deletionInfo.textContent = 'Ce secret a été supprimé définitivement après cette consultation.';
        } else {
            const retentionLabel = result.retention_label || 'la période définie';
            deletionInfo.textContent = `Ce secret restera accessible jusqu'à expiration (${retentionLabel.toLowerCase()}).`;
        }
    }
    
    resultsDiv.style.display = 'block';
}

function showPasswordSection() {
    const passwordSection = document.getElementById('passwordSection');
    if (passwordSection) {
        passwordSection.style.display = 'block';
        console.log('Section mot de passe affichée');
    } else {
        console.error('Element passwordSection non trouvé');
    }
}

function hidePasswordSection() {
    const passwordSection = document.getElementById('passwordSection');
    if (passwordSection) {
        passwordSection.style.display = 'none';
        // Vider aussi le champ
        const passwordField = document.getElementById('retrievePassword');
        if (passwordField) {
            passwordField.value = '';
        }
    }
}

// ===== UTILITAIRES =====
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copié !';
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        console.error('Erreur lors de la copie:', err);
        // Fallback pour les navigateurs qui ne supportent pas l'API clipboard
        fallbackCopy(text, button);
    });
}

function fallbackCopy(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copié !';
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 2000);
    } catch (err) {
        console.error('Erreur lors de la copie fallback:', err);
    }
    
    document.body.removeChild(textArea);
}

function showError(message, section) {
    const errorDiv = document.getElementById('errorResult');
    if (errorDiv) {
        errorDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-triangle"></i> ${message}</div>`;
        errorDiv.style.display = 'block';
    } else {
        // Créer un div d'erreur temporaire si pas trouvé
        const tempError = document.createElement('div');
        tempError.className = 'error';
        tempError.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
        
        const targetSection = document.getElementById(section);
        if (targetSection) {
            targetSection.appendChild(tempError);
            setTimeout(() => {
                if (tempError.parentNode) {
                    tempError.parentNode.removeChild(tempError);
                }
            }, 5000);
        } else {
            alert(message); // Fallback
        }
    }
    
    // Masquer les autres résultats selon la section
    if (section === 'retrieve') {
        document.getElementById('retrievedSecretResult').style.display = 'none';
    } else if (section === 'share') {
        document.getElementById('secretLinkResult').style.display = 'none';
    }
}

function hideErrors(section) {
    const errorDiv = document.getElementById('errorResult');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function checkForSecretInURL() {
    if (window.location.hash.startsWith('#secret=')) {
        const secretId = window.location.hash.replace('#secret=', '');
        if (secretId && secretId.match(/^[a-f0-9]{32}$/)) {
            // Basculer vers l'onglet de récupération
            switchToTab('retrieve');
            // Pré-remplir l'ID
            document.getElementById('secretId').value = secretId;
            // Nettoyer l'URL
            history.replaceState(null, null, window.location.pathname);
        }
    }
}

// ===== EVENT LISTENERS ADDITIONNELS =====
function setupEventListeners() {
    // Soumission avec Enter sur les champs de récupération
    document.getElementById('secretId').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            retrieveSecret();
        }
    });
    
    document.getElementById('retrievePassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            retrieveSecret();
        }
    });
    
    // Soumission avec Ctrl+Enter sur le textarea du secret
    document.getElementById('secret').addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            shareSecret();
        }
    });
}

// Fonction globale pour copier un mot de passe (appelée depuis le HTML généré)
window.copyPassword = copyPassword;