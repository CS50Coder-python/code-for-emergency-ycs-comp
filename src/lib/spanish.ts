// Static Spanish strings for the address brief and household checklist.
const phrases: Record<string, string> = {
  "The checklist changes based on your answers. Nothing is stored.": "La lista cambia según tus respuestas. No guardamos tus datos.",
  "Someone who needs help to leave: young children, an older adult, or a person with a disability": "Alguien necesita ayuda para salir: niños pequeños, una persona mayor o alguien con discapacidad",
  "No car, or we rely on someone else to drive": "No tenemos auto o dependemos de otra persona para conducir",
  "Daily medication or medical equipment that needs power": "Medicamentos diarios o equipo médico que necesita electricidad",
  "Pets or livestock": "Mascotas o animales de granja",
  "Fetching satellite data…": "Obteniendo datos satelitales…", "Checking wind and humidity…": "Revisando viento y humedad…", "Scoring nearby fires…": "Evaluando incendios cercanos…",
  "Print": "Imprimir", "Copied": "Copiado", "Copy as text message": "Copiar como mensaje de texto", "Text this to my phone": "Enviar por mensaje a mi teléfono",
  "Location is not available in this browser.": "La ubicación no está disponible en este navegador.",
  "Could not get your location. Type an address instead.": "No se pudo obtener tu ubicación. Escribe una dirección.",
  "Address not found. Try adding the city or state.": "No encontramos la dirección. Prueba a añadir la ciudad o el estado.",
  "No": "Ninguno", "n/a": "No disponible",
  "Checklist for this house": "Lista para este hogar", "Do this now": "Hacer ahora", "Do this today": "Hacer hoy", "Go bag": "Bolsa de emergencia", "Plan": "Plan",
  "If officials have ordered evacuation, leave now. Do not wait for a second message.": "Si las autoridades ordenaron evacuar, sal ahora. No esperes otro aviso.",
  "Back the car into the driveway, fuel above half, keys in your pocket.": "Estaciona el auto de reversa en la entrada, con más de medio tanque y las llaves contigo.",
  "Close all windows and doors. Move flammable furniture, propane, and firewood away from the house.": "Cierra todas las ventanas y puertas. Aleja de la casa los muebles inflamables, el propano y la leña.",
  "Sign up for county emergency alerts and keep the phone charged and loud.": "Suscríbete a las alertas de emergencia del condado y mantén el teléfono cargado y con el sonido activado.",
  "Check the map again this evening. Fires move fastest in afternoon wind.": "Vuelve a consultar el mapa esta tarde. El fuego avanza más rápido con el viento de la tarde.",
  "Clear leaves and dry brush within 1.5 metres of the walls.": "Retira hojas y maleza seca a menos de 1,5 metros de las paredes.",
  "Agree on one meeting place outside the neighbourhood and write it on the fridge.": "Elijan un punto de encuentro fuera del vecindario y anótenlo en el refrigerador.",
  "You do not have a car: arrange your ride now, before roads close. Call a neighbour, family, or 211 for transport help. Leave one risk level earlier than others.": "No tienes auto: organiza ahora quién te llevará, antes de que cierren las carreteras. Pide ayuda de transporte a un vecino, familiar o al 211. Sal con un nivel de riesgo de anticipación.",
  "You do not have a car: decide today who will drive you, and a backup. Save both numbers.": "No tienes auto: decide hoy quién te llevará y quién será el respaldo. Guarda ambos números.",
  "Someone here needs extra time to move. Start packing and loading now, not when the order comes.": "Alguien aquí necesita más tiempo para salir. Empieza a empacar y cargar ahora, no cuando llegue la orden.",
  "Plan for the person who needs help: who gets them, how long it takes, and what they must bring.": "Planifica para quien necesita ayuda: quién le ayudará, cuánto tiempo tomará y qué debe llevar.",
  "Pack seven days of medication and prescriptions. If any equipment needs power, put a charged battery or car adapter with it.": "Empaca siete días de medicamentos y recetas. Si algún equipo necesita electricidad, incluye una batería cargada o un adaptador para el auto.",
  "Medication list, dosages, doctor and pharmacy phone numbers": "Lista de medicamentos y dosis, teléfonos del médico y la farmacia",
  "Put pet carriers by the door. Many shelters do not take animals, so find a pet-friendly option now.": "Deja los transportadores de mascotas junto a la puerta. Muchos refugios no aceptan animales; busca ahora una opción que sí los acepte.",
  "Pet food, leash or carrier, vaccination record": "Comida, correa o transportador y registro de vacunas de la mascota",
  "Water (4 litres per person per day) and three days of food": "Agua (4 litros por persona al día) y comida para tres días",
  "N95 masks for smoke, one per person": "Una mascarilla N95 contra el humo por persona",
  "Photo ID, insurance papers, and a phone charger": "Identificación con foto, documentos del seguro y cargador del teléfono",
  "Flashlight, first-aid kit, and cash": "Linterna, botiquín de primeros auxilios y efectivo",
  "A change of clothes and sturdy shoes": "Una muda de ropa y zapatos resistentes",
  "Know two ways out of the neighbourhood, in case one road is blocked by fire or traffic.": "Conoce dos rutas para salir del vecindario por si el fuego o el tráfico bloquean una carretera.",
  "Tell one person outside the area where you will go. Text them when you leave and when you arrive.": "Dile a alguien fuera de la zona adónde irás. Envíale un mensaje al salir y al llegar.",
  "Take a photo of each room for insurance. It takes two minutes and saves months.": "Toma una foto de cada habitación para el seguro. Toma dos minutos y puede ahorrarte meses.",
  "Rerun this check whenever the wind changes or a warning is issued.": "Vuelve a consultar cuando cambie el viento o se emita una alerta.",
};

export function spanishText(text: string, enabled: boolean): string {
  if (!enabled) return text;
  if (phrases[text]) return phrases[text];
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/Heat detected ([\d.]+) km (.+) of this address in the last 24 hours\./, m => `Se detectó calor a ${m[1]} km al ${m[2]} de esta dirección en las últimas 24 horas.`],
    [/Nearest heat detection is ([\d.]+) km to the (.+)\./, m => `La detección de calor más cercana está a ${m[1]} km al ${m[2]}.`],
    [/Nearest heat detection is ([\d.]+) km away, to the (.+)\./, m => `La detección de calor más cercana está a ${m[1]} km, al ${m[2]}.`],
    [/^(\d+) detections within 25 km\.$/, m => `${m[1]} detecciones en un radio de 25 km.`],
    [/Wind is blowing from the (.+), the same side as the fire\./, m => `El viento viene del ${m[1]}, del mismo lado que el incendio.`],
    [/Gusts to (\d+) km\/h\./, m => `Ráfagas de hasta ${m[1]} km/h.`],
    [/Humidity (\d+)%, very dry\./, m => `Humedad del ${m[1]}%; ambiente muy seco.`],
    [/Humidity (\d+)%, dry\./, m => `Humedad del ${m[1]}%; ambiente seco.`],
    [/^No satellite heat detections within 50 km in the last 24 hours\.$/, () => "No se detectaron puntos de calor satelital en un radio de 50 km durante las últimas 24 horas."],
  ];
  for (const [pattern, render] of patterns) { const match = text.match(pattern); if (match) return render(match); }
  if (["Low", "Moderate", "High", "Extreme"].includes(text)) return ({ Low: "Bajo", Moderate: "Moderado", High: "Alto", Extreme: "Extremo" } as Record<string,string>)[text];
  return "";
}
