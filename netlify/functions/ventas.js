// netlify/functions/ventas.js
exports.handler = async function (event, context) {
  const URL_CSV_PROTEINAS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRSaA59IQ4Mf9G3Tx41NcWZId5OaeruAK7LAQspcXPzzLbpTuA-QCKvKE9Trq-KWT5TK6PWi0bt1pBu/pub?gid=0&single=true&output=csv";
  const URL_CSV_BURGERS = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRSaA59IQ4Mf9G3Tx41NcWZId5OaeruAK7LAQspcXPzzLbpTuA-QCKvKE9Trq-KWT5TK6PWi0bt1pBu/pub?gid=2017975002&single=true&output=csv";

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    return lines.slice(1).map(line => line.split(",").map(cell => cell.replace(/^"|"$/g, "").trim()));
  }

  try {
    const resProt = await fetch(URL_CSV_PROTEINAS);
    const rowsProt = parseCSV(await resProt.text());
    const fdsMap = {};

    for (const [fds, rango, prot, v, s, d] of rowsProt) {
      if (!fds || !prot) continue;
      if (!fdsMap[fds]) {
        fdsMap[fds] = { id: fds, range: rango || "", hasDailyBreakdown: true, reportedTotal: 0, proteins: {} };
      }
      const valV = parseFloat(v) || 0;
      const valS = parseFloat(s) || 0;
      const valD = parseFloat(d) || 0;
      const total = Number((valV + valS + valD).toFixed(3));
      fdsMap[fds].proteins[prot] = { V: valV, S: valS, D: valD, total };
      fdsMap[fds].reportedTotal = Number((fdsMap[fds].reportedTotal + total).toFixed(3));
    }

    const resBurg = await fetch(URL_CSV_BURGERS);
    const rowsBurg = parseCSV(await resBurg.text());
    const burgersMap = {};

    for (const [fds, prod, tipo, v, s, d] of rowsBurg) {
      if (!fds || !prod) continue;
      if (!burgersMap[prod]) {
        burgersMap[prod] = { name: prod, type: (tipo || "BURGER").toUpperCase(), fds: {} };
      }
      burgersMap[prod].fds[fds] = {
        V: parseInt(v, 10) || 0,
        S: parseInt(s, 10) || 0,
        D: parseInt(d, 10) || 0
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        status: "ok",
        updatedAt: new Date().toISOString(),
        proteinas: Object.values(fdsMap),
        burgers: Object.values(burgersMap)
      })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ status: "error", message: error.message }) };
  }
};
