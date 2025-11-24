{ pkgs ? import <nixpkgs> {} }:
  let
    # gdk = pkgs.google-cloud-sdk.withExtraComponents( with pkgs.google-cloud-sdk.components; [
    # ]);
  in
  pkgs.mkShell {
    nativeBuildInputs = with pkgs; [
      # gdk
      imagemagick
    ];

    shellHook = ''
      fish
    '';
  }
