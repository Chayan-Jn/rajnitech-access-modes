
async function handleAccess(req, res) {
    try {
        const test = await findTestById(req.params.id);  //** assuming this function gets the test from the mysql database
        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Test not found "
            })
        }
        const test_type = test.type; // mock / live
        if (test_type === "mock") {
            return handleMockTest(req, res, test);
        }
        else {
            return handleLiveTest(req, res, test);
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
        const user_attempts = await getUserAttempts(test.id, user.id); //** 
        const max_attempts = getMaxAttempts(test) || 5; //** 
        if (user_attempts >= max_attempts) {
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
    const user = req.user;
    if (!user) {
        return res.status(404).json({
            success: false,
            message: "User not found"
        })
    }
    const current_schedule = await findScheduleByTestId(test.id);//** 
    const access_type = current_schedule.access;

    // 1.Apply-only 
    if(access_type === "apply"){
        return applyOnlyMode();
    }

    // 2.Open-unlimited
    else if(access_type === "open"){
        return openAccessMode();
    }

    // 3. Institute only
    else if(access_type === "institute"){
        return instituteOnlyMode(req,res,user,test,current_schedule);
    }


}

// Access Modes Functions

async function instituteOnlyMode(req,res,user,test,current_schedule) {
    const user_institute_id = user.id;
    const test_institute_id = test.institute_id;
    const schedule_mode = current_schedule.mode;

    if(user_institute_id !== test_institute_id){
        return res.status(403).json({
            success:false,
            message:"You cannot apply to tests of this institute"
        })
    }

    const current_date_time = new Date();
    const {start_at,end_at} = current_schedule // Assuming start_at/end_at is in the same format as the new Date();


    // Mode A - Windowed Test
    if(schedule_mode === "window"){

        // Start if it is within the window
        if(current_date_time >= start_at && current_date_time < end_at){
            return testEngineController.startTest(req, res, user, test);
            // the startTest should send the start and end times to frontend
        }
        else{
            return res.status(400).json({
                success:false,
                message:"The test is not active at the moment"
            })
        }
    }
    // Mode B - Fixed Test
    if(schedule_mode === "fixed"){
        
    }


}


//** -> create/add the function after getting the controllers/functions from others
