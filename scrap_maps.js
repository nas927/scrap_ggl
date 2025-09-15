
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
            if (i % 6 == 0)
            {
                parentCard.scrollTo(0, parentCard.scrollHeight);
                cards = document.querySelectorAll("a.hfpxzc");
                console.log(cards);
            }
            console.log("click sur la carte n°" + i);
            cards[i].click();
            saveData(cards[i]);
        }, i * 5000);
    }
}

async function tryEmailScraping(name) 
{
    return new Promise((resolve, reject) => {
        let page;
        let email;
        const regex_email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
        const newWindow = window.open("https://www.google.com/search?q=restaurant+" + name.replace(" ", "+") + "+email", "_blank");
        const interval = setInterval(() => {
        try {
            if (newWindow && newWindow.document && newWindow.document.readyState === 'complete') {
                clearInterval(interval);
                console.log('Chargement terminé (polling)');
                console.log(newWindow);
                email = newWindow.document.querySelector("div[data-sncf]");

                if (email)
                {
                    email = email.textContent;
                    email = email.match(regex_email);
                    console.log(email);
                    if (email)
                        email = email[0];
                }
                else
                    email = "";
                resolve(email);
                newWindow.close();
                resolve(email.match(regex_email)[0]);
            }
        } catch (err) {
            clearInterval(interval);
            reject(new Error("Impossible d'accéder au document (cross-origin?)"));
        }
        }, 150);
    });
}

async function saveData(nom) {
    let phone = document.querySelector("button[data-item-id^=phone]");
    let site = document.querySelector("a[data-item-id=authority]");
    let map = document.querySelector("button[data-item-id=address]");
    let datas = {};

    if (phone)
        phone = "0" + phone.dataset["itemId"].match(/[^:]+$/)[0];
    if (site)
        site = site.href;
    if (map)
        map = map.textContent;

    datas["nom"] = nom.ariaLabel.replace("Lien consulté", "").trim();
    datas["map"] = map.replace(/^./, "");
    datas["numero"] = phone;
    datas["nom_site_web"] = site;
    datas["email"] = await tryEmailScraping(datas["nom"]);

    initDB().then((db) =>{
        addData(db, datas);
    });
}

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("scrap", 1);
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // Création du store avec une clé auto-incrémentée
            const store = db.createObjectStore("hotel", { keyPath: "id", autoIncrement: true });
            
            // Création d'index (facultatif, mais utile si tu veux chercher plus tard)
            store.createIndex("nom", "nom", { unique: false });
            store.createIndex("site", "site", { unique: false });
            store.createIndex("numero", "numero", { unique: false });
            store.createIndex("map", "map", { unique: false });
            store.createIndex("email", "email", { unique: false });
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

function exportIndexedDBToCSV(dbName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => {
      const db = event.target.result;

      const tx = db.transaction(db.objectStoreNames, "readonly");
      let pending = db.objectStoreNames.length;

      for (const storeName of db.objectStoreNames) {
        const store = tx.objectStore(storeName);
        const getAllReq = store.getAll();

        getAllReq.onsuccess = (e) => {
          const data = e.target.result;
          if (data.length === 0) {
            pending--;
            if (pending === 0) resolve();
            return;
          }

          // extraire les colonnes dynamiquement
          const headers = Object.keys(data[0]);
          const csvRows = [headers.join(",")];

          for (const row of data) {
            const values = headers.map(h => {
              let val = row[h] ?? "";
              val = val.toString().replace(/"/g, '""'); // échapper les guillemets
              if (val.includes(",") || val.includes("\n") || val.includes('"')) {
                val = `"${val}"`;
              }
              return val;
            });
            csvRows.push(values.join(","));
          }

          // créer et télécharger le CSV
          const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${storeName}.csv`;
          a.click();
          URL.revokeObjectURL(url);

          pending--;
          if (pending === 0) resolve();
        };

        getAllReq.onerror = (err) => reject(err);
      }
    };
  });
}

// Décommenter pour exporter la base de donnée en CSV:
// exportIndexedDBToCSV("scrap")
//   .then(() => console.log("Export CSV terminé ✅"))
//   .catch(err => console.error("Erreur export CSV :", err));


selectCard();