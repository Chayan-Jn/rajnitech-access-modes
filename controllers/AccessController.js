
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
        const max_attemps = getMaxAttempts(test) || 5; //** 
        if (user_attempts >= max_attemps) {
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


}

//** -> create/add the function after getting the controllers/functions from others
