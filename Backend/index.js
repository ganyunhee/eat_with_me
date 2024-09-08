import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import  bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
import cors from "cors"
import axios from "axios"

const app = express();
const port = 3000;
const saltRounds = 10;
const status = "success"
const fail = "fail"

// app.use(
//   cors({
//     origin: "http://localhost:8081", // Replace with your frontend domain
//     credentials: true, // Allow cookies to be sent
//   })
// );

app.use(cors())

app.use(
    session({
        secret: "EATWITHME",
        resave: false,
        saveUninitialized: true
    })
)

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "eatwithme",
    password: "admin",
    port: 5432,
});

db.connect();


app.post("/login", (req, res, next) => {
	
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err); // Handle error
    }
    if (!user) {
      return res.status(401).send("Email or password is incorrect"); // Authentication failed
    }
    // Authentication successful
    req.logIn(user, (err) => {
      if (err) {
        return next(err); // Handle error
      }
      // Send success response
      return res.send("success");
    });
  })(req, res, next);
});


app.post("/register", async (req,res)=>{
    console.log(req.body)
    let isWarning = false;
    const username = req.body.name;
    const password = req.body.password;
    const phone_number = req.body.phoneNumber;
    const email = req.body.email;
    try{
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if(checkResult.rows.length > 0){
            isWarning = "Email already registered";
            res.send(isWarning);
        }else{
            bcrypt.hash(password, saltRounds, async(err, hash)=>{
                if(err){
                    console.log("ERROR HASHING PASSWORD", err);
                }else{
                    const result = await db.query(
                    "INSERT INTO users(username, phone_number, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
                     [username,phone_number,email, hash,]   
                );
                const user = result.rows[0];
                req.login(user, (err)=>{
					console.log(req.user)
                    res.json(status);
                });
                }
            });
        }
        
    }catch(err){
        console.log(err);
		res.send(fail)
    }
})

app.post("/create-event", async(req,res)=>{
    const category =  req.body.category
    const address = req.body.address
    const user_id = req.body.user_id //user
    const event = req.body.event_name
    const member = req.body.max_members
    const time = req.body.event_time
    const groupChat =  req.body.groupChat
    const description = req.body.description
    const is_host = 1
    const is_active=1
    console.log(req.body)
    const KAKAO_API_KEY = "apikey"

        const address2 = "경북 구미시 야은로 318"; 
        const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`; 
    
       
        const response = await axios.get(url, {
          headers: {
            Authorization: `KakaoAK ${KAKAO_API_KEY}`, 
          },
        });
    
        
        const data = response.data;
        const restaurantInfo = data.documents[0]; // Access the first document in the response
    
        // Access nested objects directly
        const addressInfo = restaurantInfo.address; // Access 'address' object
        const roadAddressInfo = restaurantInfo.road_address;
    

    const placeName = restaurantInfo.road_address.building_name
    const latitude = restaurantInfo.road_address.y
    const longitude = restaurantInfo.road_address.x

    try{
    await db.query(
        "INSERT INTO locations(latitude, longitude, full_address) VALUES ($1, $2, $3)",
        [latitude, longitude, address]
      );
  
      const locationResults = await db.query(
        "SELECT location_id FROM locations WHERE full_address = $1",
        [address]
      );
  
      if (locationResults.rows.length === 0) {
        return res.status(404).json({ error: 'No location found with the given address.' });
      }
      const locationId = locationResults.rows[0].location_id;
  
    const restaurantInfo2 = await db.query("INSERT INTO restaurants(restaurant_name, category, location_id) VALUES ($1, $2, $3) RETURNING restaurant_id", [placeName, category, locationId]);
	// console.log(restaurantInfo2)
// Correctly access the restaurant_id from the returned result
	const restaurantId = restaurantInfo2.rows[0].restaurant_id;

      await db.query(
        "INSERT INTO events (event_time, event_name, host_user_id, event_description, max_members) VALUES ($1, $2, $3, $4, $5)",
        [time, event, user_id, description, member]
      );

      const event_id2 = await db.query(
        "SELECT event_id  FROM events WHERE host_user_id = $1",
        [user_id]
      );
	
		const event_idd = event_id2.rows[0].event_id

      await db.query(
        "INSERT INTO user_events(user_id, event_id, is_active) VALUES ($1, $2, $3)",
        [user_id, event_idd, is_active]
      );

     

      res.json(status)

    }catch(err){
        res.json(fail)
        console.log(err)
    }
})

app.get("/my-events", async (req,res)=>{
    const userId = req.user.user_id;
    try{
        const query = `
      SELECT
        e.event_time,
        e.event_name,
        r.restaurant_name,
        e.max_members,
        l.full_address
      FROM
        user_events ue
      JOIN
        events e ON ue.event_id = e.event_id
      JOIN
        restaurants r ON e.restaurant_id = r.restaurant_id
      JOIN
        locations l ON r.location_id = l.location_id
      WHERE
        ue.user_id = $1 AND ue.is_active = TRUE;
    `;

    const result = await db.query(query, [userId]);
    res.json(result.rows); // Send the result as JSON response

    }catch(err){
        console.log(err)
    }
})

app.get("/all-event", async (req,res)=>{
    // const empty = empty
    try{
		const query = `
			
			SELECT r.restaurant_name, e.max_members, e.event_time, r.restaurant_rating FROM events e JOIN restaurants r ON e.restaurant_id = r.restaurant_id;
		`
       const  allEvent = await db.query(query)

        if(allEvent.rows.length < 0){
            res.json("empty")
        }else{
            res.json(allEvent)
            console.log(allEvent)
        }

    }catch(err){
        console.log(err)
    }
	console.log(req.body)
})

app.post("/eat", (req,res)=>{
	console.log(req.body)
})

app.get("/search", (req,res)=>{
	console.log(req.session)
})

app.get("/user",(req,res)=>{
	res.json(req.user)
})


passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);
  
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});


