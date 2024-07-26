use std::env;

fn main() {
    println!("Hello, world!");

    let args: Vec<String> = env::args().skip(1).collect();

    match args.get(0).map(String::as_str) {
        Some("build") => {
            println!("Building")
        }
        _ => panic!("Usage: @TODO"),
    }
}
