================================================================================
KRAVSPECIFIKATION: SKY HUNTER (WEBBLÄSARVERSION FÖR PC)
================================================================================

1. ÖVERSIKT OCH SYFTE
--------------------------------------------------------------------------------

Här följer en specifikation av spelets (Sky Hunter) mekanik, 
logik, regelsystem och struktur för implementering i valfri webbläsarteknik.
Spelet utvecklas exklusivt för PC med tangentbordsstyrning och ska leverera en
arkadliknande spelupplevelse med responsiv styrning, vågbaserade fiendemönster
och linjär vapenprogression.


2. SPELTILLSTÅND (GAME STATES)
--------------------------------------------------------------------------------
Systemet ska hantera följande tillstånd och övergångar:

[Startskärm] --> [Spelaktivt] <--> [Pausad]
                      |
                      +--> [Bana Avklarad] --> [Nästa Bana]
                      |
                      +--> [Game Over] --> [High Score] --> [Startskärm]

- Startskärm (Title Screen): Visar logotyp, instruktioner, aktuellt High Score
  samt möjlighet att starta spelet via tangenttryck.
- Spelaktivt (Gameplay): Huvudloopen där fysik, kollisioner, fiendevågor och
  rendering uppdateras kontinuerligt.
- Pausad (Paused): Fryser spelets uppdateringsloop vid användarinitierad paus
  eller när webbläsarfönstret förlorar fokus.
- Bana Avklarad (Stage Clear): Kort sekvens efter att en banas slutboss eller
  sista fiendevåg besegrats. Spelarens skepp flyger ut ur bild och nästa bana
  laddas.
- Game Over: Aktiveras när alla spelarens liv är förbrukade. Visar slutpoäng
  och sparar eventuellt nytt High Score i lokalt minne.


3. SPELARENS FARTYG OCH RÖRELSEMEKANIK
--------------------------------------------------------------------------------
3.1 Rörelse och Begränsningar
- Styrning: Spelarskeppet ska kunna röras steglöst i 8 riktningar (Upp, Ned,
  Vänster, Höger samt diagonaler).
- Rörelseområde: Skeppet är låst inom den synliga spelytans gränser (Viewport
  Boundary). Skeppet kan inte flyga utanför skärmens kanter.
- Hastighet: Konstant förflyttningshastighet per bildruta vid indata.

3.2 Liv, Skada och Respawn
- Startliv: Spelaren startar med 3 liv (konfigurerbart).
- Kollisionsbox (Hitbox): Skeppet har en distinkt kollisionsyta. En enda träff
  från en fiendeprojektil eller ett fiendeskepp resulterar i att ett liv
  förloras.
- Förstörelse: Vid kollision spelas en explosionssekvens och spelarskeppet tas
  tillfälligt bort från spelfältet.
- Återräkning (Respawn):
  * Skeppet placeras åter i nedre mitten av spelfältet.
  * Spelaren tilldelas en osårbarhetsperiod (t.ex. 3 sekunder) där skeppet
    blinkar och är immunt mot skada.
  * Vid livförlust återställs spelarens vapennivå till grundnivån (Nivå 1),
    och insamlade Power-ups mot nästa nivå nollställs.


4. VAPENSYSTEM OCH UPPGRADERINGAR (POWER-UPS)
--------------------------------------------------------------------------------
4.1 Eldgivning
- Spelaren kan avfyra projektiler genom att hålla in eller trycka på skjutknappen.
- Skjutkadensen (Rate of Fire) ska vara begränsad till ett maximalt antal
  projektiler på skärmen samtidigt för att förhindra oändlig "spam-eld".

4.2 Vapennivåer (Progression)
Vapensystemet består av tre linjära nivåer:

- Nivå 1 (Enkelskott): Enkel projektil som avfyras rakt framåt från centrum.
- Nivå 2 (Dubbelskott): Två parallella projektiler från skeppets sidor.
- Nivå 3 (Trippelskott): Tre projektiler samtidigt - en rakt fram och två i
  vinkel snett utåt för bredare täckning.


4.3 Power-up-mekanik
- Spawn-kriterium: Särskilt markerade fiender eller helt utplånade fiendevågor
  utgör ett Power-up-tillfälle. I genomsnitt vart 2,67:e tillfälle genererar
  en Power-up-ikon som faller vertikalt nedåt över skärmen (ett flyttals-
  ackumulator styr exakt vilka tillfällen, så avståndet mellan två Power-ups
  varierar något men snittar 2,67 tillfällen). Det är 25 % glesare än det
  tidigare värdet (vartannat tillfälle).
- Startfördröjning: När ett nytt spel startas skapas inga Power-ups under de
  första 10 sekunderna av bana 1 (räknat från banans start), så att spelaren
  flyger en stund med grundvapnet (Nivå 1). Tillfällen under spärrtiden ger
  ingen Power-up och räknas inte in i cykeln. Det första tillfället efter
  spärrtiden genererar alltid en Power-up; därefter fortsätter den normala
  cykeln (i snitt vart 2,67:e tillfälle) under resten av spelet. Spärren
  gäller enbart bana 1 på första varvet, inte bana 4, 7 osv.
- Insamling: När spelarskeppets kollisionsbox vidrör ikonen räknas en
  Power-up (P) mot nästa vapennivå. Antalet P som krävs per nivå:
  * Nivå 1 -> Nivå 2 (Dubbelskott): 1 P, dvs uppgraderingen sker omedelbart.
  * Nivå 2 -> Nivå 3 (Trippelskott): 3 P. De två första ger ingen
    uppgradering; vapnet går till Trippelskott vid den tredje.
  Förloppet mot nästa nivå visas i HUD (t.ex. "P 1/3") och som text vid
  insamlingen.
- Maxnivå: Om spelaren samlar en Power-up vid maxnivå (Nivå 3) tilldelas
  istället bonuspoäng.


5. FIENDELOGIK, VÅGOR OCH BANSTRUKTUR
--------------------------------------------------------------------------------
5.1 Skrollande Miljö
- Bakgrunden skrollar kontinuerligt vertikalt nedåt för att skapa en känsla
  av att spelaren flyger framåt över terräng/rymd.
- Skrollhastigheten kan variera beroende på bana eller spelsekvens.

5.2 Fiendetyper
Systemet ska stödja fyra grundläggande fiendetyper:

Fiendetyp      Beteende                            Hälsa     Skjuter  Power-up
--------------------------------------------------------------------------------
Basfiende      Flyger i fasta formationer          2 träffar Sällan   Nej
Tung Fiende    Större skepp, rör sig långsamt      15-25     Ja       Nej
Vågledare      Blinkande, uppträder i formation    2 träffar Nej      Ja (våg)
Slutboss       Stort objekt med svaga punkter      Hög (x1.5)  Ja       Nej

Tålighet (antal träffar innan fienden sprängs):
- Basfiende och Vågledare: 2 träffar.
- Tung Fiende: 5 gånger banans grundvärde 3-5, dvs 15-25 träffar. Grundvärdet
  styr fortfarande poängen (500 - 1 000).
- Slutboss: Samtliga moduler (kanontorn och kärna) tål 1,5 gånger så många
  träffar som grundvärdet, dvs:
  * Fästningen (bana 1): kanontorn 36 träffar vardera, kärna 84 träffar.
  * Moderskeppet (bana 3): kanontorn 39 resp. 45 träffar, kärna 180 träffar.
  Tåligheten ökar dessutom med 30 % per genomspelat varv (looping).

Bossarnas kanontorn (skottfrekvens):
- Fästningen (bana 1): varje kanontorn skjuter ett riktat skott ca var 1,5:e
  sekund.
- Moderskeppet (bana 3): varje kanontorn skjuter ett riktat dubbelskott ca var
  2,03:e sekund (20 % lägre skottfrekvens än tidigare 1,625 s, som i sin tur
  sänktes från 1,3 s). Gäller Moderskeppet på bana 3 och på motsvarande bana
  på senare varv (bana 6, 9 osv.).
- Intervallen varierar slumpmässigt ±15 % per skott, och skottfrekvensen ökar
  med banans och varvets svårighetsgrad.

5.3 AI och Rörelsemönster
Fienders rörelser styrs av fördefinierade banor (Paths):
- Sinusvåg: Fienden rör sig nedåt i en vågformad bana.
- Dykning: Fienden flyger in från ovansidan, stannar till, och dyker sedan i
  hög hastighet mot spelarens position.
- Looping: Fienden flyger in, gör en cirkulär sväng och lämnar skärmen.

5.4 Banstruktur (Stages)
- Spelet består av en sekvens av banor med stigande svårighetsgrad.
- Varje bana består av en tids- eller sträckbaserad källkod av fiendevågor som
  avslutas med en bossstrid eller en intensiv slutvåg.
- Banlängd: Fiendevågorna fram till bossstriden (eller slutvågen) varar ungefär
  dubbelt så länge som i den ursprungliga banstrukturen. Förlängningen består
  enbart av fler kombinationer av befintliga fiendetyper, formationer och
  rörelsemönster; mekanik, svårighetsgrad per våg och bossstrider är
  oförändrade.

  Bana  Namn           Slut på fiendevågor    Varning   Boss/slutvåg startar
  ------------------------------------------------------------------------------
  1     Kusten         ca 110 s (tidigare 55)  113 s     Boss Fästningen 116 s
                                                         (tidigare 58 s)
  2     Öknen          ca 100 s (tidigare 51)  102 s     Slutvåg 105-120 s
                                                         (tidigare 54-69 s)
  3     Omloppsbanan   ca 116 s (tidigare 58)  119 s     Boss Moderskeppet 122 s
                                                         (tidigare 61 s)

  Bana 2 avslutas med samma intensiva slutvåg som tidigare, förskjuten i tid.
- Slutvågssekvens (bana 2): Bana 2 saknar bossfiende; bossstriden utgörs av en
  egen sekvens av vanliga fiender som inleds med varningen "SLUTVÅG!". Under
  och endast under denna sekvens tål samtliga fiender 50 % fler träffar
  (avrundat):
  * Basfiende och Vågledare: 3 träffar (i stället för 2).
  * Tung Fiende: 30 träffar (i stället för 20).
  Poängen per fiende är oförändrad. Ökningen gäller fiender som dyker upp
  under sekvensen, på samtliga varv, och upphör när banan är avklarad.
- Looping-mekanik: När sista banan klarats av startar spelet om från bana 1,
  men med ökad fiendehastighet och högre avfyrningsfrekvens från fienderna.


6. KOLLISIONSHANTERING OCH LOGIK
--------------------------------------------------------------------------------
Spelet kräver ett 2D-kollisionssystem med axelorienterade rektanglar (AABB)
eller cirkulära kollisionszoner för följande situationer:

Objekt 1          Objekt 2       Händelse vid kollision
--------------------------------------------------------------------------------
Spelarprojektil   Fiende         Skada fiende. Om hälsa <= 0: förstör fiende,
                                 spela explosion, lägg till poäng. Ta bort
                                 projektil.

Fiendeprojektil   Spelare        Om ej osårbar: Dra av 1 liv på spelaren,
                                 starta respawn-sekvens. Ta bort projektil.

Fiendeskepp       Spelare        Om ej osårbar: Förstör fiende, dra av 1 liv
                                 på spelaren, starta respawn-sekvens.

Spelare           Power-up       Ta bort Power-up, uppgradera spelarens vapen
                                 (eller ge bonuspoäng vid max).


7. POÄNGSYSTEM OCH ANVÄNDARGRÄNSSNITT (HUD)
--------------------------------------------------------------------------------
7.1 Visualisering på Skärmen (HUD)
Under aktivt spel ska följande information alltid vara synlig på skärmen:
- SCORE: Nuvarande poäng för den pågående spelsessionen.
- HIGH SCORE: Högsta noterade poäng.
- LIV (LIVES): Antal återstående spelarliv, representerade av små ikoner.
- BANA (STAGE): Indikator för vilken bana spelaren befinner sig på.

7.2 Poängtilldelning
- Basfiende: 100 - 200 poäng.
- Tung Fiende: 500 - 1 000 poäng.
- Fullständig fiendevåg: 1 000 bonuspoäng.
- Power-up (när maxnivå redan nåtts): 1 000 bonuspoäng.
- Slutboss: 5 000+ poäng.
- Extra liv (Extend): Spelaren tilldelas ett extra liv vid uppnådda 30 000
  poäng och därefter var 70 000:e poäng (dvs vid 30 000, 100 000, 170 000
  osv.).


8. INMATNING OCH TANGENTBORDSSTYRNING (PC)
--------------------------------------------------------------------------------
Spelet styrs exklusivt via PC-tangentbord med följande kopplingar:

- Förflyttning (8 riktningar):
  * Pilknappar (Upp, Ned, Vänster, Höger) ELLER
  * W, A, S, D (W=Upp, S=Ned, A=Vänster, D=Höger)
  * Diagonaler stöds genom att två riktningsknappar hålls in samtidigt.

- Skjut / Avfyra:
  * Mellanslag (Space), Z eller K

- Paus / Meny:
  * P eller Escape


9. PRESTANDA OCH ICKE-FUNKTIONELLA KRAV
--------------------------------------------------------------------------------
- Uppdateringsfrekvens: Spelet ska köras i låsta/synkroniserade 60 FPS med
  tidsbaserad deltauppdatering (Delta Time) för att säkerställa identisk
  spelhastighet oavsett skärmens uppdateringsfrekvens (Hz).
- Bildförhållande (Aspect Ratio): Spelytan ska upprätthålla ett vertikalt
  bildförhållande (rekommenderat 3:4 eller 4:5). På bredare PC-skärmar ska
  spelet centreras vertikalt och horisontellt med svarta sidopaneler
  (Letterboxing).
- Resursinläsning: Samtliga grafik- och ljudresurser ska laddas in och verifieras
  innan Startskärmen visas (Pre-loading).
- Fönsterfokus: Spelet ska automatiskt gå i pausläge om webbläsarfliken eller
  fönstret förlorar fokus eller minimeras.
- Lagring: High Score ska sparas i webbläsarens permanenta lokala lagring
  (Local Storage) så att det kvarstår mellan sessioner.