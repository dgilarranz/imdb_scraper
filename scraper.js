const http = require("http");
const https = require("https");
const jquery = require("jquery");
const jsdom = require("jsdom");

// Obtenemos el puerto de los argumentos. Si no se especifica, se toma el puerto 3000
const port = !isNaN(Number(process.argv[2])) ? Number(process.argv[2]) : 3000;

// Expresión regular que se usará para comprobar que los scrapes solicitados son correctos
const IMDB_REGEX = /https:\/\/imdb.com\/title\/.+/

// Creamos un servidor
const server = http.createServer((req, res) => {
    // Si se recibe una petición, se comprueba que el tipo de petición es POST
    if (req.method == "POST") {
        // Si es una petición post, verificamos que la página solicitada es de IMDB
        req.on("data", d => {
            if (IMDB_REGEX.test(d)) {
                // Parseamos la URL solicitada
                let movieData = scrapeMovie(d);
                res.statusCode = 200;
                res.setHeader("Content-Type", "text/html");
                res.end(movieData);
            }
            else {
                // Si no es una URL válida, se devuelve un error
                sendErrorResponse(res, 400, "Error: la URL debe corresponderse a una página de película en IMDB");
            }
        });
    }
    else {
        // Si no es una petición post, se devuelve un mensaje de error
        sendErrorResponse(res, 405, "Error: El servidor sólo permite métodos POST");
    }
});

// Función empleada para devolver mensajes de error
function sendErrorResponse(res, code, message) {
    res.statusCode = code;
    res.setHeader("Content-Type", "text/html");
    res.end(`<h1>${message}</h1>`);
}

// Función que hace el scraping de una página IMBD para extraer los campos relevantes
function scrapeMovie(url) {
    // Obtenemos el html de la película
    let movieHTMLData = sendRequest(url);
    let response = "";

    // Obtenemos un DOM a partir del HTML, para poder parsearlo con jQuery
    const dom = new jsdom(movieHTMLData);
    const $ = jquery(dom.window);

    // Extraemos los datos deseados de la película
    response += addEntry("Título", $("h1").attr("data-testid", "hero-title-block__title").text());
    response += addEntry("Descripción", $("p").attr("data-testid", "plot").first().text());
    
    // Extraemos el género de una página que puede estar en Inglés o en Español
    let generos = "";
    $("span:contains('Genre') ~ div > ul > li > a, span:contains('Géneros') ~ div > ul > li > a, span:contains('genre') ~ div > ul > li > a, span:contains('géneros') ~ div > ul > li > a").each(function() {
        generos += `${$(this).text()} `;
    });
    response += addEntry("Género", generos.trimEnd());
    puntuacion = $("div:contains('IMDb RATING') ~ a > div > div > div > div > span").first().text();
    response += addEntry("Puntuación", puntuacion);

    // Obetenemos la duración independientemente del idioma (se permiten español e inglés)
    response += addEntry("Duración", $("span:contains('Duración') ~ div, span:contains('duración') ~ div, span:contains('Runtime') ~ div, span:contains('runtime') ~ div").first().text());
    
    // Devolvemos la respuesta generada.
    return response;
}

// Función que solicita una URL a IMDB y devuelve el contenido HTML de la página
function sendRequest(url) {
    // Enviamos la petición
    let data = "";
    const req = https.get(url, res => {
        // Conforme se reciben trozos de la respuesta se añaden a data
        res.on("data", chunk => {
           data += chunk; 
        });
    });

    // Si hay algún error, cambiamos el valor de data a "Error al solicitar la URL"
    req.on("error", error => {
        data = `Error al solicitar la url\nDetalles:${error}`;
    });

    // Devolvemos los datos leídos
    return data;
}

// Función que devuelve un elemento html compuesto por título y valor
function addEntry(title, value) {
    return `<p><strong>${title}</strong>: ${value}</p>`
}