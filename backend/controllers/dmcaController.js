const puppeteer = require("puppeteer");

exports.submitDMCA = async (req, res) => {
    const { email, name, videoURL, contentTitle } = req.body;

    const data={
        "email":email,
        "name":name,
        "videoURL":videoURL,
        "contentTitle":contentTitle
    }
    console.log("data received!",data);

    if (!email || !name || !videoURL || !contentTitle) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const browser = await puppeteer.launch({ headless: false }); // Set to `true` for silent execution
        const page = await browser.newPage();

        await page.goto("https://support.google.com/youtube/answer/2807622");

        // Click "Submit a copyright complaint"
        await page.waitForSelector('a[href*="youtube.com/copyright_complaint_form"]');
        await page.click('a[href*="youtube.com/copyright_complaint_form"]');

        // Wait for the form to load
        await page.waitForSelector('input[name="full_name"]');

        // Fill in the form
        await page.type('input[name="full_name"]', name);
        await page.type('input[name="email"]', email);
        await page.type('textarea[name="work_description"]', `Title: ${contentTitle}`);
        await page.type('textarea[name="infringing_urls"]', videoURL);

        // Agree to terms (Modify selectors based on YouTube's form structure)
        await page.click('input[name="declaration_good_faith"]');
        await page.click('input[name="declaration_accuracy"]');

        // Click Submit
        await page.click('button[type="submit"]');

        await browser.close();

        res.json({ message: "DMCA request submitted successfully!" });
    } catch (error) {
        console.error("Error submitting DMCA:", error);
        res.status(500).json({ error: "Failed to submit DMCA request" });
    }
};
