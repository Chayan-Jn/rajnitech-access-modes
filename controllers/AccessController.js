/* Remaining 
applyOnlyController.apply(user, test)
testEngineController.startTest(req, res, user, test)
*/



const mysql = require('mysql2');

// connection
// pool provides reusable connections, good for performance
// createPool create a pool,
// createConnection creates 1 connection
// mysql pool automatically manages the connections unlike
// a single connection
const pool = mysql.createPool({
    host: 'ip addr',
    user: 'username',
    password: 'password',
    database: 'datbaseName',
    waitForConnections:true,
    connectionLimit:10,
    queueLimit:0 // unlimited queue,
    //port:3306 // (optional)
})

// to get async/await interface
const connectionPool = pool.promise()


async function connectToDb(){
    try{
        const [results] = await connectionPool.execute('SELECT 200');
        // simple query to check db connection, db returns [{ '200': 200 }]

        console.log("Db connection is successful ");
    }
    catch(err){
        console.log('Error while connecting to the database ',err);
        throw new Error('Error connecting to the database ');
    }
}
connectToDb()


// Database Helper Functions

async function findTestById(id) {

    // connection.exectue provides promise based interface, connection.query doesn't

    // Prepared statement to avoid sql injections
    const [results] = await connectionPool.execute('SELECT * FROM tests WHERE id = ?', [id]);
    // if execute encounters and err it will throw it 

    if (results.length == 0) {
        throw new Error('Test not found');
    }
    return results[0];
    // returns the first result from arr of objects
}

async function getUserAttempts(userId,testId) {
    try{
        const [results] = await connectionPool.execute('SELECT * FROM attempts WHERE user_id = ? AND schedule_id = ?',[userId,testId]);
        return results.length;
    }
    catch(err){
        console.log("Error while getting user attempts ",err)
        throw new Error('Could not get user attempts')
    }
}

//*Complete this later* 
async function getMaxAttempts(testId) {
    
}

async function findScheduleByTestId(testId) {
    try{
        const [results] = await connectionPool.execute('SELECT * FROM schedules WHERE test_id = ?',[testId]);

        if(results.length === 0){
            throw new Error('Could not get the schedule')
        }
        return results[0];

    }
    catch(err){
        console.log(`Error finding schedule for test id: ${testId}`,err)
        throw new Error('Could not get the schedule')
    }
}


// Access Functions
async function handleAccess(req, res) {
    try {
        const test = await findTestById(req.params.id);  //**  this function gets the test from the mysql database
        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Test not found "
            })
        }
        const testType = test.type; // mock / live
        if (testType === "mock") {
            return handleMockTest(req, res, test);
        }
        else if (testType == "live") {
            return handleLiveTest(req, res, test);
        }
        else {
            return res.status(400).json({
                success: false,
                message: "Invalid test type"
            })
        }
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Error occured while handling access mode"
        })
    }
}

async function handleMockTest(req, res, test) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }
        const userAttempts = await getUserAttempts(test.id, user.id); //** 
        const maxAttempts = getMaxAttempts(test) ?? 5; //** 
        if (userAttempts >= maxAttempts) {
            return res.status(400).json({
                success: false,
                message: "You have reached the max number of attempts for this test"
            })
        }
        return testEngineController.startTest(req, res, user, test); //** 
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            success: false,
            message: "Error occured while processing the mock test"
        })
    }
}

async function handleLiveTest(req, res, test) {

    try{
        const user = req.user;
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        const currentSchedule = await findScheduleByTestId(test.id);//**

        if (!currentSchedule) {
            return res.status(404).json({
                success: false,
                message: "No schedule found"
            })
        }
        const accessType = currentSchedule.access;

        // F*
        const userAttempts = await getUserAttempts(test.id, user.id); //** 
        const maxAttempts = getMaxAttempts(test) ?? 5; //** 
        if (userAttempts >= maxAttempts) {
            return res.status(400).json({
                success: false,
                message: "You have reached the max number of attempts for this test"
            })
        }


        // 1.Apply-only 
        if (accessType === "apply") {
            return applyOnlyMode(req, res, user, test, currentSchedule);
        }

        // 2.Open-unlimited
        else if (accessType === "open") {
            return openAccessMode(req, res, user, test, currentSchedule);
        }

        // 3. Institute only
        else if (accessType === "institute") {
            return instituteOnlyMode(req, res, user, test, currentSchedule);
        }

        return res.status(400).json({
            success: false,
            message: "Invalid test schedule mode"
        });
    }
    catch(err){
        console.error("Error in handleLiveTest:", err);
        return res.status(500).json({
            success: false,
            message: "An error occured while attempting the test."
        });
    }
}

// Access Modes Functions
async function applyOnlyMode(req, res, user, test, currentSchedule) {
    try {
        const validMode = isValidAccessMode(currentSchedule.mode);
        if (!validMode) {
            return res.status(400).json({
                success: false,
                message: "Invalid Access Mode"
            })
        }
        const userCurrentTime = req.body.timeStamp;
        const testActive = isTestActive(currentSchedule, userCurrentTime);
        if (testActive.status !== 200) {
            return res.status(testActive.status).json({
                success: false,
                message: testActive.message
            });
        }

        const applySuccessful = await applyOnlyController.apply(user, test);
        if (!applySuccessful) {
            return res.status(400).json({
                success: false,
                message: "Unable to apply to the test"
            })
        }
        else {
            return res.status(201).json({
                success: true,
                message: "Successfully applied to the test"
            })
        }
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({
            success: false,
            message: "Error occured while appying to the test"
        })
    }
}



async function openAccessMode(req, res, user, test, currentSchedule) {


    const validMode = isValidAccessMode(currentSchedule.mode);
    if (!validMode) {
        return res.status(400).json({
            success: false,
            message: "Invalid Access Mode"
        })
    }

    const userCurrentTime = req.body.timeStamp;
    const testActive = isTestActive(currentSchedule, userCurrentTime);
    if (testActive.status === 200) {
        return testEngineController.startTest(req, res, user, test);
    }
    else {
        return res.status(testActive.status).json({
            success: false,
            message: testActive.message
        });
    }
}


async function instituteOnlyMode(req, res, user, test, currentSchedule) {
    const userInstitureId = user.institute_id;
    const testInstitureId = test.institute_id;

    if (userInstitureId !== testInstitureId) {
        return res.status(403).json({
            success: false,
            message: "You cannot apply to tests of this institute"
        })
    }

    const validMode = isValidAccessMode(currentSchedule.mode);
    if (!validMode) {
        return res.status(400).json({
            success: false,
            message: "Invalid Access Mode"
        })
    }

    const userCurrentTime = req.body.timeStamp;
    const testActive = isTestActive(currentSchedule, userCurrentTime);
    if (testActive.status === 200) {
        return testEngineController.startTest(req, res, user, test);
    }
    else {
        return res.status(testActive.status).json({
            success: false,
            message: testActive.message
        });
    }
}

function isValidAccessMode(accessMode) {
    return ["fixed", "window"].includes(accessMode);
}

async function isTestActive(currentSchedule, userCurrentTime) {

    const startAt = new Date(currentSchedule.startAt);
    const endAt = new Date(currentSchedule.endAt);
    const currentDateTime = new Date(userCurrentTime);
    const accessMode = currentSchedule.mode;

    if (accessMode === "window") {
        // Start if it is within the window
        if (currentDateTime >= startAt && currentDateTime < endAt) {
            return {
                status: 200
            };
        }
        else {
            return {
                status: 400,
                message: "The test is not active at the moment"
            }
        }
    }
    else if (accessMode === "fixed") {
        const lateEntryMinutes = 30;
        const lastEntryTime = new Date(startAt);
        lastEntryTime.setMinutes(startAt.getMinutes() + lateEntryMinutes);

        if (currentDateTime < startAt) {
            return {
                status: 400,
                message: "The test has not started yet"
            }
        }
        else if (currentDateTime >= lastEntryTime) {
            return {
                status: 400,
                message: "You are late to the test"
            }
        }
        else {
            return { status: 200 }
        }

    }

}
//** -> create/add the function after getting the controllers/functions from others
// *** -> very important
//F* -> This code is duplicated, will make a function, so it can be reused


// *** time zone handling

/* If the test window is b/w 9 AM and 12 PM, 9-12 is the user's local time, not the server’s

So , the users from other countries should get access to the test based on their respective 9AM-12PM, not a fixed global 
time 
We can get user's time from the frontend
const userLocalTime = new Date();
const utcString = userLocalTime.toISOString();
We will get that as req.body.timeStamp

*/
