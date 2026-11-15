#include <stdio.h>
float mitad(int N) { return N / 2; }
float mitad2(int N) { return N / 2.0; }
int trunca(float F) { return F; }
char sig(char C) { return C + 1; }
double prom(int A, int B) { return (A + B) / 2.0; }
unsigned resta(unsigned A, unsigned B) { return A - B; }
void nada(void) { return; }
int sinparam() { return 7; }
int main() { nada(); printf("%.1f %.1f %d %c %.1f %u %d\n", mitad(5), mitad2(5), trunca(3.99f), sig('a'), prom(3, 4), resta(1, 2), sinparam()); printf("%d %.2f\n", trunca(mitad2(7)), mitad(trunca(9.9f))); char C = sig(127); printf("%d\n", C); return 0; }
