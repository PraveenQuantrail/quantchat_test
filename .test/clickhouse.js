const {createClient} =require("@clickhouse/client");


try {
    const con = createClient({
    url:"clickhouse+https://play:@play.clickhouse.com:443/blogs?protocol=https",
    database:'blogs',
    username:'play',
    request_timeout:5000
})


console.log(con);
}

catch(Err) {
    console.log(Err)
}