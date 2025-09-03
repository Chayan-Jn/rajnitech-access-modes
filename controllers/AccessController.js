

async function handleAccessMode(req, res) {

    try {
        const test = await findTestById(req.params.id);  //assuming this function gets the test from the mysql database
        if(!test){
            return res.status(404).json({
                success:false,
                message:"Test not found "
            })
        }
        const test_type = test.type; // mock/live
        const user = req.user;
        const user_institute_id = req.user?.institute_id;
        const access_mode = req.access_mode;

    }
    catch (err) {
        console.log(err);
    }
}
/* ????? How to get the time according to the timezone of the user1
 date = new Date()
 const istDate = date.toLocaleString("en-US", {
     timeZone: "Asia/Kolkata"
 });
 console.log(istDate)

 How to find out the correct time of the user ???
 1. Get the time zone of the user from the frontend
 2. Use luxon to find the correct time  
    const { DateTime } = require("luxon");
    const istTime = DateTime.fromISO("2025-09-02T17:47:19.010Z", { zone: "utc" })
    .setZone("Asia/Kolkata");
    console.log(istTime.toFormat("yyyy-MM-dd HH:mm:ss")); 
    // Output: "2025-09-02 23:17:19"
*/

  