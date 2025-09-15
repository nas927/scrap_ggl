
function selectCard() {
    let cards = document.querySelectorAll("a.hfpxzc");
    let parentCard = document.querySelector("div[aria-label^=Résultat]");
    const cards_length = 1500;
    console.log(cards);

    if (!cards)
    {
        setTimeout(() => {
            selectCard();
        }, 3000)
        return;
    }

    for (let i = 0; i < cards_length; i++)
    {
        setTimeout(() => {
            cards[i].click();
            saveData(cards[i]);
        }, i * 5000);
        if (i % 7 == 0)
        {
            parentCard.scrollTo(0, parentCard.scrollHeight);
            cards = document.querySelectorAll("a.hfpxzc");
        }
    }
}

function saveData(nom) {
    let phone = document.querySelector("button[data-item-id^=phone]");
    let site = document.querySelector("a[data-item-id=authority]");
    let map = document.querySelector("button[data-item-id=address]");
    let datas = {};

    if (phone)
        phone = phone.dataset["itemId"].match(/[^:]+$/)[0];
    if (site)
        site = site.href;
    if (map)
        map = map.textContent;

    datas["nom"] = nom.ariaLabel;
    datas["map"] = map;
    datas["numero"] = phone;
    datas["nom_site_web"] = site
    console.log(datas);

    initDB().then((db) =>{
        addData(db, datas);
    });
}

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("Scraping", 2);
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // Création du store avec une clé auto-incrémentée
            const store = db.createObjectStore("hotel", { keyPath: "id", autoIncrement: true });
            
            // Création d'index (facultatif, mais utile si tu veux chercher plus tard)
            store.createIndex("nom", "nom", { unique: false });
            store.createIndex("site", "site", { unique: false });
            store.createIndex("numero", "numero", { unique: false });
            store.createIndex("map", "map", { unique: false });
        };
        
        request.onerror = function(event) {
            console.error("Erreur d'ouverture :", event.target.error);
            reject(event.target.error);
        };
        
        let db = request.onsuccess = function(event) {
            const db = event.target.result;
            resolve(db);
        };
    });
}

function addData(db, data) {
  const tx = db.transaction("hotel", "readwrite");
  const store = tx.objectStore("hotel");

  const ajout = store.add(data);

  ajout.onsuccess = () => console.log("Ajouté :", data);
  ajout.onerror = (e) => console.error("Erreur ajout :", e.target.error);
}

function lireTousLesUtilisateurs(db) {
    return new Promise((resolve, reject) => {
        initDB().then((db) => {
            const transaction = db.transaction("hotel", "readonly");
            const store = transaction.objectStore("hotel");

            const requete = store.getAll();

            requete.onsuccess = () => {
                console.log("Tous les utilisateurs :", requete.result);
                resolve(requete.result);
            };

            requete.onerror = (e) => {
                console.error("Erreur lecture :", e.target.error);
                reject(e.target.error);
            };
        });      
    });
}

// Si tu veux récupérer toutes les tables enregistré décommente les 3 prochaines lignes
// copie colle dans la console js
// copie colle le tableau qu'il va t'envoyer donne à un llm pour le formatter en csv ou quoi
lireTousLesUtilisateurs().then(data => {
    const obj = Object.fromEntries(data.map(item => [item.id, item]));
    console.log(obj);
    const json = JSON.stringify(obj);
    console.log(json);
});
// Si tu souhaite supprimer la bdd existante décommente et prend juste ça 
//indexedDB.deleteDatabase("Scraping");

selectCard();