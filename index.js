const { name } = require('ejs')
const express = require('express')
const mySql = require('mysql2') //mysql2
const app = express()
const path = require('path')
const port = process.env.PORT || 4000;
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.set('view engine','ejs')
app.set('views',path.join(__dirname,'/views'))


const connection = mySql.createConnection({
    host: '134.209.101.105', // URL 
    user: 'group15', // User MySQL
    password: 'password15', // Password  MySQL
    database: 'db_group15' // Name 
})
connection.connect((err)=>{
    if(err){
        console.log('Error connecting to Database = ',err)
        return
    }
    console.log('Connecting Successful')
})

// Home
app.get('/',async(req,res)=>{
    try {
        connection.query(
            "SELECT * FROM Customers",
            (err, results, field) => {
                if (err) {
                    console.log("Error while reading a customers into DB :", err);
                    return res.status(400).send();
                }
                res.render("home",{home:results})
                // return res.status(200).json(results);
            }
        );
    } catch (error) {
        console.log("Error to Read : " , error)
        return res.status(500)
    }
})


// Register

app.get('/register',async(req,res)=>{
    res.render('register',{message : null})
})
// ทำระบบเช็คข้อมูลซ้ำ เช่น ใช้อีเมลซ้ำ
app.post('/register', async (req, res) => {
    const { Address, Name, Email, Total_Spending } = req.body;

    console.log(req.body)

    if (!Address || !Name || !Email || !Total_Spending) {
        return res.render("register", { message: "กรุณากรอกข้อมูลให้ครบถ้วน!" });
    }

    try {
        // เช็คก่อนว่า Email ซ้ำหรือไม่
        connection.query( 
            "SELECT * FROM Customers WHERE Email = ?",[Email],
            (err, results) => {
                if (err) {
                    console.log("Error while checking existing email:", err);
                    return res.status(500).send("Internal server error");
                }
                console.log(results) // Check input Info from Customers  
                console.log(results.length) // Check to Customers registed ?    
                if (results.length > 0) {
                    return res.render("register", { message: "อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้ Email อื่น" });
                }

                // ถ้าไม่ซ้ำ ให้ INSERT ได้
                connection.query(
                    "INSERT INTO Customers(Address, Name, Email, Total_Spending) VALUES (?, ?, ?, ?)",
                    [Address, Name, Email, Total_Spending],
                    (err, results) => {
                        if (err) {
                            console.log("Error while inserting a customer into DB:", err);
                            return res.status(400).send("Error creating customer");
                        }
                        res.render("register", { message: "Register Successfully" });
                    }
                );
            }
        );
    } catch (err) {
        console.log("Error to Create:", err);
        return res.status(500).send("Internal server error");
    }
});




// Add Product

app.get('/addProduct',async(req,res)=>{
    res.render('addProduct',{message : null})
})
// อย่าลืมทำระบบเช็คข้อมูลซ้ำ เช่น ใช้อีเมลซ้ำ
app.post('/addProduct', async (req, res) => {
    const { nameProduct, spec, Quantity,price, TotalSales } = req.body; // req.body put info from form by <form action="/create" method="post">
    console.log(req.body)
    if (!nameProduct || !spec || !Quantity || !price || !TotalSales) {
        return res.render("addProduct", { message: "กรุณากรอกข้อมูลให้ครบถ้วน!" });
    }
    try {
        connection.query(   

            "INSERT INTO Product(nameProduct, spec, Quantity,price, TotalSales) VALUES (?, ?, ?, ?, ?)",
            [nameProduct, spec, Quantity,price, TotalSales],    
            (err, results) => { // ไม่ต้องมี field
                if (err) {
                    console.log("Error while inserting a customers into DB :", err);
                    return res.status(400).send("Error creating product"); // ส่ง error message กลับไปด้วย
                }
                res.render("addProduct",{message : "Add Product Successfully "})
            }
        );
    } catch (err) {
        console.log("Error to Create : ", err);
        return res.status(500).send("Internal server error"); // ส่ง error message กลับไปด้วย
    }
});


// Update Product

app.get('/updateProduct',async(req,res)=>{
    res.render('updateProduct',{message : null})
})
app.post('/updateProduct', async (req, res) => {
    const { nameProduct, Quantity } = req.body; 

    console.log(req.body);

    // ตรวจสอบว่ามีค่า nameProduct และ Quantity หรือไม่
    if (!nameProduct || !Quantity) {
        return res.render("updateProduct", { message: "กรุณากรอกข้อมูลให้ครบถ้วน!" });
    }

    try {
        // ตรวจสอบว่าสินค้านี้มีอยู่ในระบบหรือไม่
        connection.query(
            "SELECT * FROM Product WHERE nameProduct = ?",
            [nameProduct],
            (err, results) => {
                if (err) {
                    console.log("Error while checking product:", err);
                    return res.status(500).send("Internal server error");
                }

                if (results.length === 0) {
                    return res.render("addProduct", { message: "ไม่พบสินค้านี้ในระบบ!" });
                }

                // ถ้ามีสินค้าอยู่ในระบบแล้ว อัปเดต Quantity
                connection.query(
                    "UPDATE Product SET Quantity = Quantity + ? WHERE nameProduct = ?",
                    [Quantity,nameProduct],
                    (err, results) => {
                        if (err) {
                            console.log("Error while updating product:", err);
                            return res.status(400).send("Error updating product");
                        }
                        console.log(results)
                        res.render("updateProduct",{ message: "Update Successfully!" });
                    }
                );
            }
        );
    } catch (err) {
        console.log("Error to Update:", err);
        return res.status(500).send("Internal server error");
    }
});


// All Receipt
app.get('/receipt', async (req, res) => {
    try {
        const results = await new Promise((resolve, reject) => {
            connection.query(
                "SELECT * FROM Customers c INNER JOIN Orders o ON c.CustomerID = o.OrderID INNER JOIN Product p ON o.productID = p.productID",
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
        console.log(results)
        // return res.status(200).json(results);
        res.render("receipt",{receipt:results})
    } catch (error) {
        console.error("Error to Read : ", error);
        return res.status(500).send();
    }
})


// Print Receipt Customer
app.get('/receiptcustomer', async (req, res) => {
    res.render('receiptCustomer', { message: null, receiptCustomer: []});    
});

app.post('/receiptcustomer', async (req, res) => {
    const { email } = req.body; 

    if (!email) {
        return res.render("receiptCustomer", { message: "กรุณาระบุอีเมลลูกค้า", receiptCustomer: [] });
    }
    try {
        const results = await new Promise((resolve,reject)=>{
            connection.query(
                `SELECT c.Name ,c.Email ,p.nameProduct ,p.price,p.TotalSales,o.Date From Customers c
                INNER JOIN Orders o ON c.CustomerID = o.CustomerID
                INNER JOIN Product p ON o.productID = p.productID
                WHERE c.Email = ? `,
                [email],
                (err,results)=>{
                    if(err)
                        reject(err)
                    else
                        resolve(results)
                }
            )
        })
        console.log(results)
        if(results.length === 0 )
        {
            return res.render('receiptCustomer',{message:"There is no your receipt",receiptCustomer:[]})
        }
        res.render('receiptCustomer',{message : null , receiptCustomer : results})
    } catch (error) {
        console.log("Error : " , error)
        return res.status(500).send("เกิดข้อผิดพลาด")                
    }
});

//Delete Members

app.get('/delete',(req,res)=>{
    res.render('delete',{message : null})
})
app.post('/delete',async(req,res)=>{
    try {
        const { Email } = await req.body; // รับค่า Email จาก body
        if (!Email) {
            return res.status(400).json({ message: "Email is required" });
        }
        connection.query(
            "DELETE FROM Customers WHERE Email = ?",[Email],
            (err, results, field) => {
                if (err) {
                    console.log("Error while reading a customers into DB :", err);
                    return res.status(400).send();
                }
                if(results.affectedRows === 0)
                {
                    return res.status(404).json({ message: "Email non successfully Del" });
                }
                // return res.status(201).json({ message: "Email successfully Del" });
                res.render('delete',{message : "delete members SuccessFully"})
            }
        );
    } catch (error) {
        console.log("Error to Read : " , error)
        return res.status(500)
    }
})
app.listen(2000,'localhost',async(req,res)=>{
    console.log(`Example app listening on port ${port}`)
})
