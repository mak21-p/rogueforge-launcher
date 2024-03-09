// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::{panic, path::Path, process::Command, time::Instant};

use log::{error, info};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::Manager;
use tokio::{
    fs::File,
    io::{AsyncReadExt, AsyncWriteExt, BufWriter},
};

#[derive(Serialize)]
pub struct Progress {
    pub download_id: i64,
    pub filesize: u64,
    pub transfered: u64,
    pub transfer_rate: f64,
    pub percentage: f64,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct Patch {
    guid: String,
    storage_zone_name: String,
    path: String,
    object_name: String,
    length: i64,
    last_changed: String,
    server_id: i64,
    array_number: i64,
    is_directory: bool,
    user_id: String,
    content_type: String,
    date_created: String,
    storage_zone_id: i64,
    checksum: String,
    replicated_zones: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn sha256_digest(file_location: String) -> Result<String, String> {
    println!("{}", file_location);
    info!("getting sha256_digest of file {}", file_location);
    //get file
    let mut file = File::open(file_location).await.map_err(|err| {
        error!("{}", err.to_string());
        err.to_string()
    })?;
    let mut buffer = Vec::new();
    //read file to end (reads it in binary)
    file.read_to_end(&mut buffer).await.map_err(|err| {
        error!("{}", err.to_string());
        err.to_string()
    })?;
    //sets up a sha256 algorith to digest the file
    let mut context = Sha256::new();

    //adds content to hasher
    context.update(buffer);

    let digest = context.finalize();
    //hashes the file contents and sends it
    let digest_string = hex::encode(digest);
    Ok(digest_string)
}

#[tauri::command]
async fn download_files(
    app: tauri::AppHandle,
    urls: Vec<String>,
    destinations: Vec<String>,
) -> Result<(), String> {
    info!("starting to download files");
    let client = Client::new();
    if urls.is_empty() {
        info!("No urls to process");
        return Err("No urls to process".to_string());
    }

    for (index, url) in urls.iter().enumerate() {
        let destination = &destinations[index];

        let total_size = client.head(url).send().await.map_err(|err| {
            error!("{}", err.to_string());
            err.to_string()
        })?;

        if total_size.status().is_success() {
            let size = total_size
                .headers()
                .get(reqwest::header::CONTENT_LENGTH)
                .and_then(|ct_len| ct_len.to_str().ok().and_then(|ct_len| ct_len.parse().ok()))
                .unwrap_or(0);

            let request = client.get(url);
            let mut response = request.send().await.map_err(|err| {
                error!("{}", err.to_string());
                err.to_string()
            })?;

            let mut out = BufWriter::new(File::create(&destination).await.map_err(|err| {
                error!("{}", err.to_string());
                err.to_string()
            })?);
            let mut downloaded: u64 = 0;
            let start = Instant::now();
            let mut progress = Progress {
                download_id: index as i64,
                filesize: size,
                transfered: 0,
                transfer_rate: 0.0,
                percentage: 0.0,
            };

            while let Some(chunk) = response.chunk().await.map_err(|err| err.to_string())? {
                match out.write_all(&chunk).await {
                    Ok(_) => (),
                    Err(err) => {
                        error!("the problem is :{}", err.to_string());
                        return Err(err.to_string());
                    }
                };
                downloaded += chunk.len() as u64;
                out.flush().await.map_err(|err| err.to_string())?;
                progress.transfered = downloaded;
                progress.percentage = if size != 0 {
                    (100.0 * downloaded as f64) / size as f64
                } else {
                    0.0
                };
                progress.transfer_rate = downloaded as f64 / start.elapsed().as_secs_f64();

                match app.emit_all("DOWNLOAD_PROGRESS", &progress) {
                    Ok(_) => {
                        //println!("the progress is :{}%", progress.percentage.to_string());
                    }
                    Err(err) => {
                        error!("the problem is :{}", err.to_string());
                        println!("the problem is :{}", err.to_string());
                        return Err(err.to_string());
                    }
                };
            }
            match app.emit_all("DOWNLOAD_FINISHED", &progress) {
                Ok(_) => {
                    info!("download for file {} finished", &destination)
                }
                Err(err) => {
                    error!("the problem is :{}", err.to_string());
                    println!(
                        "the problem is :{}",
                        total_size.status().as_str().to_string()
                    );
                    return Err(err.to_string());
                }
            }
            // app.emit_all("DOWNLOAD_FINISHED", &progress).unwrap();
        } else {
            error!(
                "the problem is :{}",
                total_size.status().as_str().to_string()
            );
            return Err(total_size.status().as_str().to_string());
        }
    }
    info!("all files downloaded successfully");
    Ok(())
}

#[tauri::command]
fn check_file_exists(filePath: String) -> Result<String, String> {
    let exist = Path::new(&filePath).exists();

    if exist {
        Ok("Found".to_string())
    } else {
        return Err("Not Found".to_string());
    }
}

#[tauri::command]
fn open_app(path: String) -> Result<String, String> {
    info!("opening world of warcraft");
    let child = Command::new(path).spawn().map_err(|err| {
        error!("{}", err.to_string());
        err.to_string()
    })?;

    Ok(format!("Application opened with PID {}", child.id()))
}

#[tauri::command]
async fn get_patches() -> Result<String, String> {
    info!("getting all patches available");
    let client = Client::new();
    let body = client
        .get("https://ny.storage.bunnycdn.com/echos-patches/")
        .header("AccessKey", "0105dae2-598c-4178-b327b29f833d-9239-4944")
        .send()
        .await
        .map_err(|err| {
            error!("{}", err.to_string());
            err.to_string()
        })?;
    let b = body.text().await.unwrap();
    //let patches: Patches = serde_json::from_str(&b).unwrap();

    Ok(b.to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            greet,
            sha256_digest,
            check_file_exists,
            download_files,
            open_app,
            get_patches
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
