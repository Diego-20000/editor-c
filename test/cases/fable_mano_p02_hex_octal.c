#include <stdio.h>
int main() { unsigned U = 255, Z = 0; printf("[%x][%X][%#x][%#X][%o][%#o][%8x][%-8x][%08x][%#010x]\n", U, U, U, U, U, U, U, U, U, U); printf("[%x][%#x][%o][%#o][%.0x][%#.0o][%.5x][%#.5x]\n", Z, Z, Z, Z, Z, Z, U, U); printf("[%u][%10u][%-10u][%010u]\n", 4000000000u, 4000000000u, 4000000000u, 4000000000u); return 0; }
