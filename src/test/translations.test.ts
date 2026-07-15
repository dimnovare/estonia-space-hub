import { describe, it, expect } from "vitest";
import translations from "@/i18n/translations";

describe("translation completeness", () => {
  const etKeys = Object.keys(translations.et);
  const enKeys = Object.keys(translations.en);
  const ruKeys = Object.keys(translations.ru);
  const lvKeys = Object.keys(translations.lv);
  const ltKeys = Object.keys(translations.lt);

  it("English has all Estonian keys", () => {
    const missing = etKeys.filter(k => !enKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("Russian has all Estonian keys", () => {
    const missing = etKeys.filter(k => !ruKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("Estonian has all English keys", () => {
    const missing = enKeys.filter(k => !etKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("Latvian has all Estonian keys", () => {
    const missing = etKeys.filter(k => !lvKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("Latvian has no extra keys beyond Estonian", () => {
    const extra = lvKeys.filter(k => !etKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it("Lithuanian has all Estonian keys", () => {
    const missing = etKeys.filter(k => !ltKeys.includes(k));
    expect(missing).toEqual([]);
  });

  it("Lithuanian has no extra keys beyond Estonian", () => {
    const extra = ltKeys.filter(k => !etKeys.includes(k));
    expect(extra).toEqual([]);
  });

  it("all five language blocks have equal key counts", () => {
    expect(enKeys.length).toBe(etKeys.length);
    expect(ruKeys.length).toBe(etKeys.length);
    expect(lvKeys.length).toBe(etKeys.length);
    expect(ltKeys.length).toBe(etKeys.length);
  });

  it("uses the approved pending-offer request copy in every customer language", () => {
    expect(translations.et).toMatchObject({
      "offer.requestThis": "Küsi seda pakkumist",
      "offer.requestConfirmTitle": "Saada see soov Ruumlyle?",
      "offer.requestConfirmBody": "See ei ole veel kinnitatud broneering. Ruumly kontrollib saadavuse partneriga; makset ei tehta.",
      "offer.requestConfirmAction": "Jah, saada soov",
      "offer.requestSent": "Soov saadetud",
      "offer.requestSentBody": "Ruumly kinnitab saadavuse partneriga ja võtab sinuga ühendust.",
      "offer.yourRequest": "Sinu soov",
    });
    expect(translations.en).toMatchObject({
      "offer.requestThis": "Request this offer",
      "offer.requestConfirmTitle": "Send this request to Ruumly?",
      "offer.requestConfirmBody": "This is not a confirmed booking yet. Ruumly will check availability with the provider; no payment is taken.",
      "offer.requestConfirmAction": "Yes, send request",
      "offer.requestSent": "Request sent",
      "offer.requestSentBody": "Ruumly will confirm availability with the provider and contact you.",
      "offer.yourRequest": "Your request",
    });
    expect(translations.ru).toMatchObject({
      "offer.requestThis": "Запросить это предложение",
      "offer.requestConfirmTitle": "Отправить запрос в Ruumly?",
      "offer.requestConfirmBody": "Это ещё не подтверждённое бронирование. Ruumly проверит доступность у партнёра; оплата не взимается.",
      "offer.requestConfirmAction": "Да, отправить запрос",
      "offer.requestSent": "Запрос отправлен",
      "offer.requestSentBody": "Ruumly подтвердит доступность у партнёра и свяжется с вами.",
      "offer.yourRequest": "Ваш запрос",
    });
    expect(translations.lv).toMatchObject({
      "offer.requestThis": "Pieprasīt šo piedāvājumu",
      "offer.requestConfirmTitle": "Nosūtīt šo pieprasījumu Ruumly?",
      "offer.requestConfirmBody": "Šī vēl nav apstiprināta rezervācija. Ruumly pārbaudīs pieejamību pie partnera; maksājums netiks veikts.",
      "offer.requestConfirmAction": "Jā, nosūtīt pieprasījumu",
      "offer.requestSent": "Pieprasījums nosūtīts",
      "offer.requestSentBody": "Ruumly apstiprinās pieejamību pie partnera un sazināsies ar jums.",
      "offer.yourRequest": "Tavs pieprasījums",
    });
    expect(translations.lt).toMatchObject({
      "offer.requestThis": "Užklausti šį pasiūlymą",
      "offer.requestConfirmTitle": "Siųsti šią užklausą Ruumly?",
      "offer.requestConfirmBody": "Tai dar nėra patvirtintas užsakymas. Ruumly patikrins prieinamumą su partneriu; mokėjimas nebus nuskaičiuotas.",
      "offer.requestConfirmAction": "Taip, siųsti užklausą",
      "offer.requestSent": "Užklausa išsiųsta",
      "offer.requestSentBody": "Ruumly patvirtins prieinamumą su partneriu ir susisieks su jumis.",
      "offer.yourRequest": "Jūsų užklausa",
    });
  });

  it("uses the approved provider discovery and outreach review copy in every operator language", () => {
    const providerCopy = {
      "admin.leads.stageProviders": ["Leia ja võta partneritega ühendust", "Find and contact providers", "Найдите поставщиков и свяжитесь с ними", "Atrodi pakalpojumu sniedzējus un sazinies", "Raskite paslaugų teikėjus ir susisiekite"],
      "admin.leads.searchProviders": ["Otsi partnereid, linnu, aadresse või kontakte", "Search providers, cities, addresses or contacts", "Поиск по поставщикам, городам, адресам или контактам", "Meklē pakalpojumu sniedzējus, pilsētas, adreses vai kontaktus", "Ieškokite paslaugų teikėjų, miestų, adresų ar kontaktų"],
      "admin.leads.scopeNearby": ["Läheduses", "Nearby", "Рядом", "Tuvumā", "Netoliese"],
      "admin.leads.scopeAll": ["Kogu Eesti", "All Estonia", "Вся Эстония", "Visa Igaunija", "Visa Estija"],
      "admin.leads.allServices": ["Kõik teenused", "All services", "Все услуги", "Visi pakalpojumi", "Visos paslaugos"],
      "admin.leads.radiusKm": ["{count} km", "{count} km", "{count} км", "{count} km", "{count} km"],
      "admin.leads.distanceUnavailable": ["Vahemaa pole saadaval", "Distance unavailable", "Расстояние недоступно", "Attālums nav pieejams", "Atstumas nepasiekiamas"],
      "admin.leads.otherLocations": ["Muud asukohad", "Other locations", "Другие адреса", "Citas atrašanās vietas", "Kitos vietos"],
      "admin.leads.noEmail": ["E-posti aadress puudub", "No email address", "Нет адреса электронной почты", "Nav e-pasta adreses", "Nėra el. pašto adreso"],
      "admin.leads.alreadyContacted": ["Juba ühendust võetud", "Already contacted", "Уже связались", "Jau sazinājāmies", "Jau susisiekta"],
      "admin.leads.reviewProviders": ["Vaata üle sõnum {count} partnerile", "Review message to {count} providers", "Проверить сообщение для {count} поставщиков", "Pārskatīt ziņojumu {count} pakalpojumu sniedzējiem", "Peržiūrėti žinutę {count} paslaugų teikėjams"],
      "admin.leads.reviewMessageTitle": ["Vaata partneripäring üle", "Review provider outreach", "Проверить обращение к поставщикам", "Pārskatīt ziņojumu pakalpojumu sniedzējiem", "Peržiūrėti užklausą paslaugų teikėjams"],
      "admin.leads.recipient": ["Saaja", "Recipient", "Получатель", "Saņēmējs", "Gavėjas"],
      "admin.leads.subject": ["Teema", "Subject", "Тема", "Temats", "Tema"],
      "admin.leads.message": ["Sõnum", "Message", "Сообщение", "Ziņojums", "Žinutė"],
      "admin.leads.sendOutreach": ["Saada saadavuspäring", "Send availability request", "Отправить запрос о доступности", "Nosūtīt pieejamības pieprasījumu", "Siųsti prieinamumo užklausą"],
      "admin.leads.resendOutreach": ["Saada saadavuspäring uuesti", "Resend availability request", "Повторно отправить запрос о доступности", "Atkārtoti nosūtīt pieejamības pieprasījumu", "Pakartotinai siųsti prieinamumo užklausą"],
      "admin.leads.skipAlreadyContacted": ["Varem kontaktitud partnerid jäetakse vahele", "Previously contacted providers will be skipped", "Ранее опрошенные поставщики будут пропущены", "Iepriekš uzrunātie pakalpojumu sniedzēji tiks izlaisti", "Anksčiau kontaktuoti paslaugų teikėjai bus praleisti"],
    } as const;
    const languages = [translations.et, translations.en, translations.ru, translations.lv, translations.lt];

    Object.entries(providerCopy).forEach(([key, values]) => {
      values.forEach((value, index) => expect(languages[index][key]).toBe(value));
    });
  });
});
