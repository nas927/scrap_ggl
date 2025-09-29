function selectCard(begin = 0) {
    let cards = document.querySelectorAll("div[data-testid=store-card] a[data-testid=store-card]");
    console.log(cards);

    if (!cards)
    {
        setTimeout(() => {
            selectCard();
        }, 3000)
        return;
    }
    parcoursCard(cards, begin);
}

function parcoursCard(cards, begin) 
{
    for (let i = begin; i < cards.length; i++)
    {
        setTimeout(() => {
            GoToCard(cards[i]);
        }, i * 17000);
    }
    setTimeout(() => {
        getNext(cards.length);
    }, cards.length * 18000);
}

function GoToCard(card) {
    let windowRef = window.open(card.href, "_blank");
    const interval = setInterval(() => {
        try {
            if (windowRef && windowRef.document && windowRef.document.readyState === 'complete') {
                clearInterval(interval);
                inCard(windowRef);
                console.log('Chargement terminé (polling)');
            }
        } catch (e) {
            console.log("Attente du chargement de la page");
        }
    }, 1000);
}

function inCard(windowRef) {
    let info = windowRef.document.querySelector("div[data-testid=store-desktop-loaded-coi] a");
    if (info)
    {
        document.addEventListener("load", e => e.preventDefault(), true);
        document.addEventListener("DOMContentLoaded", e => e.preventDefault(), true);
        console.log(info);
        info.click();
        setTimeout(() => {
            saveData(windowRef);
        }, 3000);
    }
    else
    {
        inCard(windowRef);
        console.log("Attente du chargement du composant info");
        return;
    }
}

function getNext(begin) {
    const button = but = document.querySelector("div[data-test=feed-desktop] + div + div button");
    if (button)
    {
        button.click();
        window.scrollTo(0, document.body.scrollHeight);
    }
    setTimeout(() => {
        selectCard(begin);
    }, 3000);
}

function saveData(windowRef) {
    console.log("page : ", windowRef);
    let dialog = windowRef.document.querySelector("div[role=dialog]");
    if (!dialog)
    {
        console.log("info indisponible sur cette page");
        windowRef.close();
        return;
    }
    let info = dialog.querySelector("div[data-testid]");
    let content = info.innerText;
    console.log(content);
    let datas = {};

    datas["fiche"] = content;

    initDB().then((db) =>{
        addData(db, datas);
        windowRef.close();
    });

}

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("scrap_ubereat", 1);
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // Création du store avec une clé auto-incrémentée
            const store = db.createObjectStore("hotel", { keyPath: "id", autoIncrement: true });
            
            // Création d'index (facultatif, mais utile si tu veux chercher plus tard)
            store.createIndex("fiche", "fiche", { unique: false });
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