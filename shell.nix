{ pkgs ? import <nixpkgs> {} }:
  let
    gdk = pkgs.google-cloud-sdk.withExtraComponents( with pkgs.google-cloud-sdk.components; [
    ]);
  in
  pkgs.mkShell {
    # nativeBuildInputs is usually what you want -- tools you need to run
    # Check last version of playwright https://search.nixos.org/packages?channel=unstable&from=0&size=50&sort=relevance&type=packages&query=playwright-driver
    nativeBuildInputs = with pkgs; [
      gdk
    ];

    shellHook = ''
      fish
    '';
  }