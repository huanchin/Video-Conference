const express = require("express");
const app = express();
const server = require("http").Server(app);
const fs = require("fs");
server.listen(process.env.PORT || 8080);

/****** serve the home page ******/
app.use(express.static("public"));
app.set("view engine", "ejs");
app.get("/", (req, res) => {
  res.render("frontpage");
});

/****** handle create meeting room route ******/
const { v4: uuidv4 } = require("uuid");
let un, pc;
app.get("/newroom", (req, res) => {
  un = req.query.username;
  pc = req.query.passcode;
  const roomId = uuidv4();
  fs.appendFileSync(
    "public/meeting-log.txt",
    roomId + ":" + pc + "\n",
    "utf-8"
  );
  res.redirect(`/${roomId}`);
});

/****** handle join meeting route ******/
let unJ, inJ, pcJ;
app.get("/joinroom", (req, res) => {
  unJ = req.query.username;
  inJ = req.query.invitation;
  pcJ = req.query.passcode;
  const log = fs.readFileSync("public/meeting-log.txt", "utf-8");
  let findInvitation = log.indexOf(inJ + ":" + pcJ);
  if (findInvitation != -1) {
    res.redirect(`/${inJ}`);
    (un = unJ), (pc = pcJ);
  } else {
    findInvitation = log.indexOf(inJ);
    if (findInvitation == -1) {
      res.send("Invalid invitation. Please <a href=/>go back</a>");
    } else {
      const findPassCode = log.indexOf(inJ + ":" + pcJ);
      if (findPassCode == -1) {
        res.send("Invalid password. Please <a href=/>go back</a>");
      }
    }
  }
});

/****** handle enter meeting room route ******/
app.get("/:room", (req, res) => {
  res.render("meeting-room", {
    roomId: req.params.room,
    username: un,
  });
});

/*** Importing and Setting Up the Express Peer Server ***/
const { ExpressPeerServer } = require("peer");
/*** creates a PeerJS server instance using ExpressPeerServer ***/
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
/*** Integrating the PeerJS Server with an Express Application ***/
// This line tells the Express application to use the PeerJS server at the /peerjs path
// any requests to /peerjs on your server will be handled by the PeerJS server
app.use("/peerjs", peerServer);

/**** Setting Up Socket.IO ****/
const io = require("socket.io")(server);

/**** Listen on socket.io connection ****/
io.on("connection", (socket) => {
  /****** handle join room ******/
  socket.on("join-room", (roomId, peerId) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-connected", peerId);

    socket.on("stop-screen-share", (peerId) => {
      io.to(roomId).emit("no-share", peerId);
    });

    socket.on("message", (message, sender, color, time) => {
      io.to(roomId).emit("createMessage", message, sender, color, time);
    });

    socket.on("leave-meeting", (peerId, peerName) => {
      io.to(roomId).emit("user-leave", peerId, peerName);
    });
  });
});

app.post("/upload", (req, res) => {
  const fileName = req.headers["file-name"];
  req.on("data", (chunk) => {
    fs.appendFileSync(__dirname + "/public/uploaded-files/" + fileName, chunk);
  });
  res.end("uploaded");
});
