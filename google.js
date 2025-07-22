
function selectCard() {
    const cards = document.querySelectorAll("div[jscontroller=gOTY1][data-id=hepl]");
    let end = 0;
    console.log(cards);

    if (!cards)
    {
        setTimeout(() => {
            selectCard();
        }, 3000)
        return;
    }

    for (let i = 0; i < cards.length; i++)
    {
        setTimeout(() => {
            if (cards[i].firstChild.firstChild)
            {
                // firstChild.children[1].firstChild.textContent
                let c;
                if (cards[i].firstChild.firstChild.children[1])
                    c = cards[i].firstChild.firstChild.children[1].firstChild;
                else
                    c = cards[i].firstChild.firstChild.firstChild.firstChild;

                c.click();
                c = c.firstChild.children[1].firstChild.textContent;
                saveData(c);
            }
        }, i * 5000);
        end++;
    }

    console.log(end);
    setTimeout(() => {
        goNext();
    }, end * 4000);
}

function goNext() {
    const next = document.getElementById("pnnext");

    if (next)
        next.click();
    else
        console.log("fini !");
}

function saveData(nom) {
    let phone = document.querySelector("a[data-phone-number]");
    let site = document.querySelector("div[jsname=UXbvIb] > a");
    let map = document.querySelector("svg[aria-label=Adresse] + span");
    let datas = {};

    if (phone)
        phone = phone.dataset["phoneNumber"];
    if (site)
        site = site.href;
    if (map)
        map = map.textContent;

    datas["nom"] = nom;
    datas["map"] = map;
    datas["numero"] = phone;
    datas["nom_site_web"] = site

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
