{
  description = "koteya.net";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  };

  outputs = inputs@{ self, nixpkgs,  ... }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs {
      inherit system;
    };
  in {
    devShells.${system}.default = pkgs.mkShell {
      packages = with pkgs; [
       	imagemagick
      ];

      name = "koteya.net shell";

      shellHook = ''
        exec fish
      '';
    };
  };
}
