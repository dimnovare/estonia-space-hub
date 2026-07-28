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

  it("uses Diip Solutions as the legal operator in every language", () => {
    const languages = [translations.et, translations.en, translations.ru, translations.lv, translations.lt];

    languages.forEach(language => {
      const legalCopy = [
        language["footer.entity"],
        language["footer.operatedBy"],
        language["footer.legalEntity"],
        language["terms.s1.text"],
        language["privacy.s1.text"],
        language["invoice.notVatRegistered"],
      ].join(" ");

      expect(legalCopy).toContain("Diip Solutions OÜ");
      expect(legalCopy).toContain("17527757");
      expect(language["invoice.address"]).toContain("Uus-Sadama tn 15-2");
      expect(language["terms.validFrom"]).toContain("28");
      expect(language["privacy.validFrom"]).toContain("28");
      expect(legalCopy).not.toMatch(/Valguse Kodu|14621591|EE102246089|Narva mnt 128-4/);
    });
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

  it("uses the approved active-draft offer-stage copy in every operator language", () => {
    const offerCopy = {
      "admin.leads.stageOffer": ["Koosta kliendi valikud", "Build customer options", "Создать варианты для клиента", "Izveidot klienta variantus", "Kurti variantus klientui"],
      "admin.leads.activeDraft": ["Aktiivne mustand", "Active draft", "Активный черновик", "Aktīvais melnraksts", "Aktyvus juodraštis"],
      "admin.leads.oneActiveDraft": ["Üks aktiivne mustand", "One active draft", "Один активный черновик", "Viens aktīvs melnraksts", "Vienas aktyvus juodraštis"],
      "admin.leads.previousOffers": ["Varasemad pakkumised", "Previous offers", "Предыдущие предложения", "Iepriekšējie piedāvājumi", "Ankstesni pasiūlymai"],
      "admin.leads.newDraft": ["Uus mustand", "New draft", "Новый черновик", "Jauns melnraksts", "Naujas juodraštis"],
      "admin.leads.deleteDraft": ["Kustuta mustand", "Delete draft", "Удалить черновик", "Dzēst melnrakstu", "Ištrinti juodraštį"],
      "admin.leads.deleteDraftTitle": ["Kas kustutada see mustand?", "Delete this draft?", "Удалить этот черновик?", "Dzēst šo melnrakstu?", "Ištrinti šį juodraštį?"],
      "admin.leads.deleteDraftBody": ["Mustand ja selle valikud kustutatakse jäädavalt.", "The draft and its options will be permanently removed.", "Черновик и его варианты будут удалены безвозвратно.", "Melnraksts un tā varianti tiks neatgriezeniski dzēsti.", "Juodraštis ir jo variantai bus negrįžtamai ištrinti."],
      "admin.leads.draftDeleted": ["Mustand kustutatud", "Draft deleted", "Черновик удалён", "Melnraksts dzēsts", "Juodraštis ištrintas"],
      "admin.leads.addToOffer": ["Lisa pakkumisse", "Add to offer", "Добавить в предложение", "Pievienot piedāvājumam", "Pridėti prie pasiūlymo"],
    } as const;
    const languages = [translations.et, translations.en, translations.ru, translations.lv, translations.lt];

    Object.entries(offerCopy).forEach(([key, values]) => {
      values.forEach((value, index) => expect(languages[index][key]).toBe(value));
    });
  });

  it("uses the approved provider-quote page copy in every provider language", () => {
    // The tokenized quote page is public and provider-facing; the link language
    // follows the SUPPLIER's country, so all five must read natively.
    const quoteCopy = {
      "quote.title": ["Esita oma hind Ruumlyle", "Submit your quote for Ruumly", "Отправьте свою цену для Ruumly", "Iesniedziet savu cenu Ruumly", "Pateikite savo kainą Ruumly"],
      "quote.askTitle": ["Mille kohta hinda küsime", "What you're quoting for", "На что вы даёте цену", "Par ko sniedzat cenu", "Už ką teikiate kainą"],
      "quote.submitCta": ["Saada hind", "Send quote", "Отправить цену", "Nosūtīt cenu", "Siųsti kainą"],
      "quote.updateCta": ["Uuenda oma hinda", "Update your quote", "Обновить цену", "Atjaunināt cenu", "Atnaujinti kainą"],
      "quote.thanksTitle": ["Aitäh! Sinu hind on saadetud", "Thank you! Your quote is in", "Спасибо! Ваша цена принята", "Paldies! Jūsu cena ir saņemta", "Ačiū! Jūsų kaina gauta"],
      "quote.invalidTitle": ["Seda päringut ei leitud", "This request wasn't found", "Запрос не найден", "Pieprasījums netika atrasts", "Užklausa nerasta"],
      "quote.rateLimitTitle": ["Liiga palju katseid", "Too many attempts", "Слишком много попыток", "Pārāk daudz mēģinājumu", "Per daug bandymų"],
      // The PII promise must be explicit in every language.
      "quote.noPii": ["Me ei jaga sinuga kliendi kontaktandmeid.", "We don't share the customer's contact details with you.", "Мы не передаём вам контактные данные клиента.", "Mēs nedalāmies ar klienta kontaktinformāciju.", "Mes nesidaliname kliento kontaktiniais duomenimis."],
    } as const;
    const languages = [translations.et, translations.en, translations.ru, translations.lv, translations.lt];

    Object.entries(quoteCopy).forEach(([key, values]) => {
      values.forEach((value, index) => expect(languages[index][key]).toBe(value));
    });
  });

  it("uses the approved quick-send and quote-surfacing copy in every operator language", () => {
    const opsCopy = {
      "admin.leads.quickSend": ["Saada päring {count} sobivale partnerile", "Send outreach to {count} matched providers", "Отправить запрос {count} подходящим поставщикам", "Nosūtīt pieprasījumu {count} atbilstošiem pakalpojumu sniedzējiem", "Siųsti užklausą {count} tinkamiems paslaugų teikėjams"],
      "admin.leads.quickSendHint": ["Valib e-postiga lähedased partnerid — vaatad üle enne saatmist", "Pre-selects nearby providers with email — you review before sending", "Выбирает ближайших поставщиков с эл. почтой — вы проверяете перед отправкой", "Izvēlas tuvumā esošos pakalpojumu sniedzējus ar e-pastu — jūs pārskatāt pirms nosūtīšanas", "Parenka netoliese esančius paslaugų teikėjus su el. paštu — peržiūrite prieš siųsdami"],
      "admin.leads.fromProviderQuote": ["partneri hinnast", "from provider quote", "из цены поставщика", "no pakalpojumu sniedzēja cenas", "iš teikėjo kainos"],
      "admin.leads.quotedAmount": ["Pakkus {amount} {unit}", "Quoted {amount} {unit}", "Предложил {amount} {unit}", "Piedāvāja {amount} {unit}", "Pasiūlė {amount} {unit}"],
      // Quote tokens are minted per recipient at send time, so the preview link
      // is a sample — every operator language must say so.
      "admin.leads.sampleQuoteLink": ["Sõnumis olev hinnalink on näidis — iga partner saab saatmisel oma unikaalse lingi.", "The quote link in this message is a sample — each provider gets their own unique link when you send.", "Ссылка на цену в этом сообщении — образец: при отправке каждый поставщик получит свою уникальную ссылку.", "Cenas saite šajā ziņojumā ir paraugs — nosūtot katrs pakalpojumu sniedzējs saņem savu unikālo saiti.", "Kainos nuoroda šioje žinutėje yra pavyzdys — išsiuntus kiekvienas paslaugų teikėjas gauna savo unikalią nuorodą."],
    } as const;
    const languages = [translations.et, translations.en, translations.ru, translations.lv, translations.lt];

    Object.entries(opsCopy).forEach(([key, values]) => {
      values.forEach((value, index) => expect(languages[index][key]).toBe(value));
    });
  });

  it("uses the approved delivery-review and booking-confirmation copy in every operator language", () => {
    const deliveryCopy = {
      "admin.leads.stageDelivery": ["Vaata üle ja saada", "Review and send", "Проверить и отправить", "Pārskatīt un nosūtīt", "Peržiūrėti ir siųsti"],
      "admin.leads.reviewDelivery": ["Vaata saatmine üle", "Review delivery", "Проверить отправку", "Pārskatīt nosūtīšanu", "Peržiūrėti siuntimą"],
      "admin.leads.emailPreview": ["E-kiri", "Email", "Электронное письмо", "E-pasts", "El. laiškas"],
      "admin.leads.pagePreview": ["Kliendi leht", "Customer page", "Страница клиента", "Klienta lapa", "Kliento puslapis"],
      "admin.leads.sendEffectsTitle": ["Saatmisel toimub:", "Sending will:", "При отправке произойдёт следующее:", "Nosūtot notiks:", "Išsiuntus bus:"],
      "admin.leads.effectEmail": ["Saada e-kiri aadressile {email}", "Send email to {email}", "Отправить письмо на {email}", "Nosūtīt e-pastu uz {email}", "Siųsti el. laišką adresu {email}"],
      "admin.leads.effectLive": ["Muuda kliendi link aktiivseks", "Make the customer link live", "Активировать ссылку клиента", "Aktivizēt klienta saiti", "Aktyvinti kliento nuorodą"],
      "admin.leads.effectQuoted": ["Muuda päringu staatuseks Hinnastatud", "Move the lead to Quoted", "Перевести запрос в статус «Предложение отправлено»", "Mainīt pieprasījuma statusu uz Piedāvāts", "Pakeisti užklausos būseną į Pasiūlyta"],
      "admin.leads.effectViewed": ["Märgi avatuks, kui klient lingi avab", "Record Viewed when the customer opens the link", "Отметить просмотр, когда клиент откроет ссылку", "Atzīmēt kā skatītu, kad klients atver saiti", "Pažymėti kaip peržiūrėtą, kai klientas atidaro nuorodą"],
      "admin.leads.effectRequested": ["Salvesta ootel soov ja teavita Ruumlyt", "Record a pending preference and alert Ruumly", "Сохранить ожидающий выбор и уведомить Ruumly", "Saglabāt gaidošu izvēli un paziņot Ruumly", "Išsaugoti laukiamą pasirinkimą ir pranešti Ruumly"],
      "admin.leads.effectNoBooking": ["Makset ei võeta ega kinnitatud broneeringut ei looda", "Not take payment or create a confirmed booking", "Не списывать оплату и не создавать подтверждённое бронирование", "Neiekasēt maksājumu un neveidot apstiprinātu rezervāciju", "Nenuskaityti mokėjimo ir nekurti patvirtinto užsakymo"],
      "admin.leads.customerRequested": ["Klient soovis seda valikut", "Customer requested this option", "Клиент запросил этот вариант", "Klients pieprasīja šo variantu", "Klientas užklausė šio varianto"],
      "admin.leads.confirmBooking": ["Kinnita partneriga ja märgi broneerituks", "Confirm with provider and mark booked", "Подтвердить у поставщика и отметить забронированным", "Apstiprināt ar pakalpojumu sniedzēju un atzīmēt kā rezervētu", "Patvirtinti su paslaugų teikėju ir pažymėti užsakytu"],
      "admin.leads.confirmBookingTitle": ["Kas kinnitada broneeringu tulemus?", "Confirm this booking outcome?", "Подтвердить результат бронирования?", "Apstiprināt rezervācijas rezultātu?", "Patvirtinti užsakymo rezultatą?"],
      "admin.leads.confirmBookingBody": ["Kasuta seda ainult pärast seda, kui partner on saadavuse kinnitanud.", "Use this only after the provider confirms availability.", "Используйте это только после подтверждения доступности поставщиком.", "Izmanto tikai pēc tam, kad pakalpojumu sniedzējs ir apstiprinājis pieejamību.", "Naudokite tik paslaugų teikėjui patvirtinus prieinamumą."],
      "admin.leads.markBooked": ["Märgi broneerituks", "Mark booked", "Отметить забронированным", "Atzīmēt kā rezervētu", "Pažymėti užsakytu"],
      "admin.leads.bookingConfirmed": ["Broneeringu tulemus kinnitatud", "Booking outcome confirmed", "Результат бронирования подтверждён", "Rezervācijas rezultāts apstiprināts", "Užsakymo rezultatas patvirtintas"],
    } as const;
    const languages = [translations.et, translations.en, translations.ru, translations.lv, translations.lt];

    Object.entries(deliveryCopy).forEach(([key, values]) => {
      values.forEach((value, index) => expect(languages[index][key]).toBe(value));
    });
  });
});
