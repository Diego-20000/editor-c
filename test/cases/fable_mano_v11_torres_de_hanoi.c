#include <stdio.h>
int MOV = 0;
void hanoi(int N, char O, char D, char A) { if (N == 0) return; hanoi(N - 1, O, A, D); MOV++; if (N == 4) printf("%c->%c ", O, D); hanoi(N - 1, A, D, O); }
int main() { hanoi(10, 'A', 'C', 'B'); printf("\n%d\n", MOV); return 0; }
