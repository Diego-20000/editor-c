#include <stdio.h>
int X = 1;
void g(void) { X++; }
int main() { int Y = X; { int X = 10; X++; Y += X; { int X = 100; Y += X; } Y += X; } g(); Y += X; if (Y > 0) { int Y = 5; X += Y; } for (int X = 0; X < 3; X++) Y += X; printf("%d %d\n", X, Y); { int I; for (I = 0; I < 2; I++) { int Z = I * 2; Y += Z; } } printf("%d\n", Y); return 0; }
