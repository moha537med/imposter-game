// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

const rooms = {};

const categories = {
  "أكلات": [
    "كشري","بيتزا","ملوخية","شاورما","فول","طعمية","محشي","ورق عنب","كرمب",
    "مسقعة","بامية","كفتة","مشويات","حمام محشي","سمك مشوي","سمك مقلي",
    "جمبري","سوشي","برجر","هوت دوج","بطاطس مقلية","بطاطس محمرة","بطاطس بيوريه",
    "مكرونة بشاميل","مكرونة نجرسكو","سباجتي","لازانيا","شوربة عدس",
    "شوربة خضار","شوربة فراخ","شوربة لسان عصفور","سلطة طحينة","سلطة خضراء",
    "سلطة بابا غنوج","متبل","تبولة","فتوش","فراخ مشوية","فراخ بانيه",
    "فراخ كنتاكي","ستيك","كبدة اسكندراني","سجق","رز بلبن","أم علي",
    "مهلبية","بسبوسة","كنافة","قطايف","جلاش","كحك","بيتي فور",
    "دونات","تشيز كيك","كيك شوكولاتة","كيك فانيليا","آيس كريم",
    "كريب","وافل","بان كيك","فطير مشلتت","عيش بلدي","عيش فينو"
  ],

  "وظائف": [
    "دكتور","مهندس","مدرس","محامي","صيدلي","ممرض","ممرضه","طيار","مضيف طيران",
    "ضابط","جندي","شرطي","قاضي","مذيع","صحفي","مصمم جرافيك","مطور ويب",
    "مطور تطبيقات","مبرمج","محاسب","مدير","مدير مبيعات","مندوب مبيعات",
    "سائق","ميكانيكي","كهربائي","سباك","نجار","حداد","رسام",
    "ممثل","مخرج","منتج","مصور","مونتير","يوتيوبر","بلوجر",
    "مدرب كورة","لاعب كورة","حارس مرمى","حلاق","شيف","طباخ",
    "مزارع","صياد","رائد فضاء","عالم","باحث","مترجم",
    "مضيف فندق","ريسبشن","موظف بنك","أمين مخزن","مندوب شحن",
    "عامل نظافة","فني صيانة","خباز","بائع","أمين مكتبة"
  ],

  "افلام مصرية": [
    "اللمبي","الفيل الأزرق","عمر وسلمى","تيتة رهيبة","جعلتني مجرما",
    "الجزيرة","الجزيرة 2","ابراهيم الابيض","كده رضا","عسل اسود",
    "واحد من الناس","حين ميسرة","هي فوضى","الرهينة","حرب اطاليا",
    "بوبوس","طير انت","سمير وشهير وبهير","البدلة","لف ودوران",
    "جوازة ميري","الحرب العالمية الثالثة","عندليب الدقي","صعيدي في الجامعة الامريكية",
    "الناظر","مرجان احمد مرجان","السفارة في العمارة","التجربة الدنماركية",
    "زكي شان","جحيم في الهند","الباشا تلميذ","اللي بالي بالك",
    "عبود على الحدود","ميدو مشاكل","بوحة","حسن ومرقص",
    "كابتن هيما","عمر 2000","الدادة دودي","كباريه",
    "حين ميسرة","الخلية","تراب الماس","الفيل الأزرق 2",
    "العار","الكيت كات","الارهاب والكباب","النوم في العسل"
  ],

  "حيوانات": [
    "أسد","قطة","فيل","زرافة","نمر","كلب","ذئب","ثعلب","دب",
    "قرد","حصان","حمار","بقرة","جاموسة","خروف","ماعز",
    "جمل","كنغر","باندا","كوالا","غزال","فهد","تمساح",
    "سلحفاة","أرنب","سنجاب","فأر","خفاش","ضبع","غوريلا",
    "بطريق","نسر","صقر","بومة","حمامة","ديك","دجاجة",
    "بطة","أوزة","سمكة","قرش","حوت","دولفين","فرس نهر",
    "أخطبوط","جمبري","سلطعون","نحلة","فراشة","عقرب","أفعى"
  ]
};

function generateRoomId() {
  return Math.random().toString(36).substring(2, 7);
}

io.on("connection", (socket) => {

  socket.on("createRoom", ({ name, category }) => {
    const roomId = generateRoomId();

    rooms[roomId] = {
      players: [],
      category,
      word: null,
      imposterId: null,
      hostId: socket.id,
      phase: "waiting",
      votes: {}
    };

    socket.join(roomId);

    rooms[roomId].players.push({
      id: socket.id,
      name
    });

    socket.emit("roomJoined", { roomId, host: true });
    io.to(roomId).emit("playersUpdate", rooms[roomId].players);
  });

  socket.on("joinRoom", ({ name, roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    socket.join(roomId);

    room.players.push({
      id: socket.id,
      name
    });

    socket.emit("roomJoined", { roomId, host: false });
    io.to(roomId).emit("playersUpdate", room.players);
  });

  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    if (socket.id !== room.hostId) {
      socket.emit("errorMessage", "فقط صاحب الغرفة يقدر يبدأ اللعبة");
      return;
    }

    if (room.players.length < 2) {
      socket.emit("errorMessage", "لازم لاعبين على الأقل");
      return;
    }

    const words = categories[room.category];
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomImposter =
      room.players[Math.floor(Math.random() * room.players.length)];

    room.word = randomWord;
    room.imposterId = randomImposter.id;
    room.phase = "discussion";
    room.votes = {};

    room.players.forEach((player) => {
      if (player.id === room.imposterId) {
        io.to(player.id).emit("role", { role: "imposter" });
      } else {
        io.to(player.id).emit("role", {
          role: "normal",
          word: room.word
        });
      }
    });

    io.to(roomId).emit("phaseUpdate", room.phase);
  });

  socket.on("vote", ({ roomId, targetId }) => {
    const room = rooms[roomId];
    if (!room || room.phase !== "voting") return;

    room.votes[socket.id] = targetId;

    if (Object.keys(room.votes).length === room.players.length) {
      const count = {};

      Object.values(room.votes).forEach(id => {
        count[id] = (count[id] || 0) + 1;
      });

      let maxVotes = 0;
      let votedOut = null;

      for (let id in count) {
        if (count[id] > maxVotes) {
          maxVotes = count[id];
          votedOut = id;
        }
      }

      room.phase = "result";

      const winner =
        votedOut === room.imposterId
          ? "المدنيين كسبوا 🎉"
          : "الـ Imposter كسب 😈";

      io.to(roomId).emit("gameResult", { winner });
    }
  });

  socket.on("startVoting", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    if (socket.id !== room.hostId) return;

    room.phase = "voting";
    io.to(roomId).emit("phaseUpdate", "voting");
  });

  socket.on("resetGame", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    if (socket.id !== room.hostId) return;

    room.phase = "waiting";
    room.word = null;
    room.imposterId = null;
    room.votes = {};

    io.to(roomId).emit("phaseUpdate", "waiting");
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.players = room.players.filter(p => p.id !== socket.id);
      io.to(roomId).emit("playersUpdate", room.players);
    }
  });
});

server.listen(PORT, () => {
  console.log("Server running on http://localhost:3000");
});