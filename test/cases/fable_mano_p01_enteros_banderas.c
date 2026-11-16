#include <stdio.h>
int main() { int A = 42, B = -42, Z = 0; printf("[%d][%5d][%-5d][%05d][%+d][% d][%+05d][%-+5d]\n", A, A, A, A, A, A, A, A); printf("[%d][%5d][%-5d][%05d][%+d][% d][% 05d]\n", B, B, B, B, B, B, B); printf("[%.3d][%8.3d][%-8.3d][%08.3d][%.0d][%5.0d][%+.0d]\n", A, A, A, A, Z, Z, Z); return 0; }
